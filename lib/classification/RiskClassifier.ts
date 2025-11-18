import type { IProvider, Message } from '../providers/IProvider.js';
import { RiskLevelJudge } from './judges/RiskLevelJudge.js';
import type {
  RiskLevel,
  RiskLevelResult,
  RiskTypeResult,
  ClassificationConfig,
} from './types/index.js';
import { RISK_LEVEL_SCORES, scoreToRiskLevel } from './types/index.js';
import { ModelSelector } from '../providers/ModelSelector.js';
import { ProviderWithFallback } from '../providers/ProviderWithFallback.js';
import { serializeConversation } from './ConversationSerializer.js';

/**
 * Risk Classifier
 *
 * Orchestrates risk classification using one or more judges
 *
 * Default: Single judge (fast, cheap) with automatic model selection
 * Optional: Multiple judges with consensus (more reliable, higher cost)
 *
 * NEW: Automatically selects cheapest viable model based on input size,
 * with fallback to more expensive models on failure/timeout.
 */
export class RiskClassifier {
  private baseProvider: IProvider;
  private useMultipleJudges: boolean;

  constructor(provider: IProvider, config: ClassificationConfig = {}) {
    this.baseProvider = provider;
    this.useMultipleJudges = config.useMultipleJudges ?? false;
  }

  /**
   * Create judges for the given messages
   *
   * Selects models based on input size and creates fallback providers
   */
  private createJudges(messages: Message[]): RiskLevelJudge[] {
    // Estimate input size
    const conversationText = serializeConversation(messages, {
      approach: 'full_history',
      style: 'xml',
    });

    if (this.useMultipleJudges) {
      // Multi-judge mode: Create 3 different judges with different model selections
      // This provides diversity while still being cost-efficient

      // Judge 1: Cheapest viable model
      const selection1 = ModelSelector.selectModels({
        inputText: conversationText,
        requiredCapabilities: { riskClassification: true },
      });

      // Judge 2: Second-cheapest (first fallback from judge 1)
      const models2 = selection1.fallbacks.length > 0
        ? [selection1.fallbacks[0], selection1.primary, ...selection1.fallbacks.slice(1)]
        : [selection1.primary, ...selection1.fallbacks];

      // Judge 3: Third option or back to primary
      const models3 = selection1.fallbacks.length > 1
        ? [selection1.fallbacks[1], selection1.primary, ...selection1.fallbacks.filter((_, i) => i !== 1)]
        : [selection1.primary, ...selection1.fallbacks];

      console.info(`[RiskClassifier] Multi-judge mode: ${selection1.reason}`);

      return [
        new RiskLevelJudge(
          new ProviderWithFallback(this.baseProvider, [selection1.primary, ...selection1.fallbacks]),
          selection1.primary.id
        ),
        new RiskLevelJudge(
          new ProviderWithFallback(this.baseProvider, models2),
          models2[0].id
        ),
        new RiskLevelJudge(
          new ProviderWithFallback(this.baseProvider, models3),
          models3[0].id
        ),
      ];
    } else {
      // Single-judge mode: Use cheapest viable model with fallbacks
      const selection = ModelSelector.selectModels({
        inputText: conversationText,
        requiredCapabilities: { riskClassification: true },
      });

      console.info(`[RiskClassifier] Single-judge mode: ${selection.reason}`);

      return [
        new RiskLevelJudge(
          new ProviderWithFallback(this.baseProvider, [selection.primary, ...selection.fallbacks]),
          selection.primary.id
        ),
      ];
    }
  }

  /**
   * Classify risk level from messages
   *
   * Single judge: Returns that judge's result
   * Multiple judges: Returns averaged result with agreement metric
   *
   * NEW: Automatically selects models based on input size
   */
  async classifyRisk(messages: Message[], includeDebug: boolean = false): Promise<{
    risk_level: RiskLevel;
    confidence: number;
    explanation: string;
    language?: string; // ISO 639-1 language code
    locale?: string; // Locale string (e.g., 'en-US')
    /**
     * Specific risk types detected (combined from the same LLM call)
     */
    risk_types?: RiskTypeResult[];
    agreement?: number; // Only present if using multiple judges
    debug_requests?: Array<{
      model: string;
      messages: Message[];
      systemPrompt: string;
      temperature: number;
      maxTokens: number;
    }>;
  }> {
    // Create judges with automatic model selection
    const judges = this.createJudges(messages);

    if (judges.length === 1) {
      // Single judge mode
      const result = await judges[0].judge(messages);

      const response: any = {
        risk_level: result.level,
        confidence: result.confidence,
        explanation: result.reflection,
        language: result.language,
        locale: result.locale,
        risk_types: result.risk_types,
      };

      // Include debug info if requested
      if (includeDebug && judges[0].lastRequest) {
        response.debug_requests = [judges[0].lastRequest];
      }

      return response;
    }

    // Multi-judge mode
    const results = await Promise.all(judges.map(judge => judge.judge(messages)));

    // Calculate agreement using variance of scores
    const scores = results.map(r => RISK_LEVEL_SCORES[r.level]);
    const agreement = this.calculateAgreement(scores);

    // Average the results
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const risk_level = scoreToRiskLevel(avgScore);

    // Use highest confidence if judges agree, lower if they disagree
    const baseConfidence = Math.max(...results.map(r => r.confidence));
    const confidence = agreement >= 0.8 ? baseConfidence : baseConfidence * agreement;

    // Use first judge's explanation and language/locale (should be same across judges)
    const explanation = results[0].reflection;
    const language = results[0].language;
    const locale = results[0].locale;

    // Combine risk types across judges by taking the max confidence per type
    const riskTypeConfidence: Map<string, number> = new Map();
    for (const result of results) {
      for (const rt of result.risk_types ?? []) {
        const prev = riskTypeConfidence.get(rt.type) ?? 0;
        if (rt.confidence > prev) {
          riskTypeConfidence.set(rt.type, rt.confidence);
        }
      }
    }
    const risk_types: RiskTypeResult[] =
      Array.from(riskTypeConfidence.entries()).map(([type, conf]) => ({
        type: type as RiskTypeResult['type'],
        confidence: conf,
      }));

    // Warn if low agreement
    if (agreement < 0.67) {
      console.warn(`Low judge agreement: ${agreement.toFixed(2)}`);
    }

    const response: any = {
      risk_level,
      confidence,
      explanation,
      language,
      locale,
      agreement,
      risk_types: risk_types.length > 0 ? risk_types : undefined,
    };

    // Include debug info if requested
    if (includeDebug) {
      response.debug_requests = judges
        .map(judge => judge.lastRequest)
        .filter(req => req !== undefined);
    }

    return response;
  }

  /**
   * Calculate agreement between judges
   *
   * Uses coefficient of variation (inverse):
   * - 1.0 = perfect agreement
   * - 0.8+ = good agreement
   * - 0.67-0.8 = tentative agreement
   * - <0.67 = poor agreement
   *
   * Note: This is a simplified metric. For production, consider
   * Krippendorff's alpha for more robust agreement measurement.
   */
  private calculateAgreement(scores: number[]): number {
    if (scores.length === 1) return 1.0;

    // Calculate mean
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Calculate variance
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;

    // Calculate standard deviation
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation
    const cv = mean === 0 ? 0 : stdDev / mean;

    // Convert to agreement metric (1.0 - cv, clamped to [0, 1])
    const agreement = Math.max(0, Math.min(1, 1.0 - cv));

    return agreement;
  }
}
