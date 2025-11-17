import type { IProvider, Message } from '../providers/IProvider.js';
import { RiskLevelJudge } from './judges/RiskLevelJudge.js';
import type {
  RiskLevel,
  RiskLevelResult,
  ClassificationConfig,
} from './types/index.js';
import { RISK_LEVEL_SCORES, scoreToRiskLevel } from './types/index.js';

/**
 * Risk Classifier
 *
 * Orchestrates risk classification using one or more judges
 *
 * Default: Single judge (fast, cheap)
 * Optional: Multiple judges with consensus (more reliable, higher cost)
 */
export class RiskClassifier {
  private judges: RiskLevelJudge[];
  private useMultipleJudges: boolean;

  constructor(provider: IProvider, config: ClassificationConfig = {}) {
    this.useMultipleJudges = config.useMultipleJudges ?? false;

    if (this.useMultipleJudges) {
      // Multi-judge mode: Use different models for diversity
      const models = config.models || [
        'anthropic/claude-haiku-4.5',
        'qwen/qwen-3-30b',
        'openai/gpt-4o-mini',
      ];

      const judgeCount = config.judgeCount ?? 3;
      this.judges = models
        .slice(0, judgeCount)
        .map(model => new RiskLevelJudge(provider, model));
    } else {
      // Single-judge mode (default)
      const model = config.models?.[0] || 'anthropic/claude-haiku-4.5';
      this.judges = [new RiskLevelJudge(provider, model)];
    }
  }

  /**
   * Classify risk level from messages
   *
   * Single judge: Returns that judge's result
   * Multiple judges: Returns averaged result with agreement metric
   */
  async classifyRisk(messages: Message[]): Promise<{
    risk_level: RiskLevel;
    confidence: number;
    explanation: string;
    language?: string; // ISO 639-1 language code
    locale?: string; // Locale string (e.g., 'en-US')
    agreement?: number; // Only present if using multiple judges
  }> {
    if (this.judges.length === 1) {
      // Single judge mode
      const result = await this.judges[0].judge(messages);
      return {
        risk_level: result.level,
        confidence: result.confidence,
        explanation: result.reflection,
        language: result.language,
        locale: result.locale,
      };
    }

    // Multi-judge mode
    const results = await Promise.all(this.judges.map(judge => judge.judge(messages)));

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

    // Warn if low agreement
    if (agreement < 0.67) {
      console.warn(`Low judge agreement: ${agreement.toFixed(2)}`);
    }

    return {
      risk_level,
      confidence,
      explanation,
      language,
      locale,
      agreement,
    };
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
