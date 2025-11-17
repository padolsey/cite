/**
 * Evaluator
 *
 * Main orchestrator for /v1/evaluate endpoint
 * Coordinates:
 * - Risk classification
 * - Safe response generation
 * - Crisis resource resolution
 * - Behavioral constraints
 *
 * Simple by default, progressively enhanced
 */

import type { EvaluateRequest, EvaluateResponse, RiskState } from './types.js';
import type { RiskLevel } from '../classification/types/index.js';
import { RiskClassifier } from '../classification/RiskClassifier.js';
import { RiskTypesJudge } from '../classification/judges/RiskTypesJudge.js';
import type { IResourceResolver } from '../resources/IResourceResolver.js';
import { resolveCountryCodes } from '../resources/LanguageToCountry.js';
import {
  getSafeResponse,
  shouldShowCrisisResources,
  shouldHighlightUrgency,
  allowMethodDetails,
  shouldLogEvent,
} from '../responses/templates.js';
import { RISK_LEVEL_SCORES } from '../classification/types/index.js';

export interface EvaluatorDependencies {
  classifier: RiskClassifier;
  resourceResolver: IResourceResolver;
  /**
   * Optional: judge for specific risk types (self-harm, psychosis, etc.)
   * If provided, risk_types will be populated for medium+ risk.
   */
  riskTypesJudge?: RiskTypesJudge;
}

/**
 * Evaluator orchestrates safety evaluation
 */
export class Evaluator {
  private classifier: RiskClassifier;
  private resourceResolver: IResourceResolver;
  private riskTypesJudge?: RiskTypesJudge;

  constructor(dependencies: EvaluatorDependencies) {
    this.classifier = dependencies.classifier;
    this.resourceResolver = dependencies.resourceResolver;
    this.riskTypesJudge = dependencies.riskTypesJudge;
  }

  /**
   * Evaluate conversation for safety risks
   */
  async evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
    const { messages, config, risk_state: previousState, conversation_id } = request;

    // 1. Classify risk level (includes language detection)
    const classification = await this.classifier.classifyRisk(messages);
    const { risk_level, confidence, explanation, agreement, language, locale } = classification;

    // 2. Generate safe response (if requested)
    const safe_reply = config.return_assistant_reply !== false
      ? getSafeResponse(risk_level, config.user_age_band)
      : undefined;

    // 3. Resolve country codes (explicit > locale > language > global)
    const countryCodes = resolveCountryCodes(
      config.user_country,
      locale,
      language
    );

    // 4. Resolve crisis resources (supports both sync and async resolvers)
    const crisis_resources = await Promise.resolve(
      this.resourceResolver.resolve(
        countryCodes.length > 0 ? countryCodes : [] // Empty array triggers global resources
      )
    );

    // 5. Build core response
    const response: EvaluateResponse = {
      risk_level,
      confidence,
      explanation,
      show_crisis_resources: shouldShowCrisisResources(risk_level),
      highlight_urgency: shouldHighlightUrgency(risk_level),
      allow_method_details: allowMethodDetails(risk_level),
      safe_reply,
      crisis_resources,
      log_recommended: shouldLogEvent(risk_level),
    };

    // 5. Progressive enhancement: risk types (if judge available and risk is medium+)
    const isMediumPlus =
      risk_level === 'medium' || risk_level === 'high' || risk_level === 'critical';
    if (this.riskTypesJudge && isMediumPlus) {
      response.risk_types = await this.riskTypesJudge.judge(
        // Evaluator messages are structurally compatible with provider messages
        request.messages as any
      );
    }

    // 6. Progressive enhancement: Add advanced fields if needed
    // Risk trend (if previous state provided)
    // 6. Progressive enhancement: Add advanced fields if needed
    // Risk trend (if previous state provided)
    if (previousState) {
      const trend = this.calculateTrend(previousState.current_risk, risk_level);
      response.trend = trend;
      response.trend_explanation = this.getTrendExplanation(
        previousState.current_risk,
        risk_level,
        trend
      );
    }

    // Updated risk state (if conversation tracking enabled)
    if (conversation_id) {
      response.risk_state = this.buildRiskState(
        conversation_id,
        risk_level,
        confidence,
        previousState,
        explanation
      );
    }

    // Actions (for medium+ risk)
    if (risk_level !== 'none' && risk_level !== 'low') {
      response.actions = this.buildActions(risk_level);
    }

    // Behavioral constraints (for medium+ risk)
    if (risk_level !== 'none' && risk_level !== 'low') {
      response.constraints = this.buildConstraints(risk_level);
    }

    // UI guidance (for medium+ risk)
    if (risk_level !== 'none' && risk_level !== 'low') {
      response.ui_guidance = this.buildUIGuidance(risk_level);
    }

    // Agreement metric (if multiple judges used)
    if (agreement !== undefined) {
      response.agreement = agreement;
    }

    return response;
  }

  /**
   * Calculate risk trend
   */
  private calculateTrend(
    previousRisk: RiskLevel,
    currentRisk: RiskLevel
  ): 'up' | 'down' | 'stable' | 'unknown' {
    const prevScore = RISK_LEVEL_SCORES[previousRisk];
    const currScore = RISK_LEVEL_SCORES[currentRisk];

    if (currScore > prevScore) return 'up';
    if (currScore < prevScore) return 'down';
    return 'stable';
  }

  /**
   * Get human-readable trend explanation
   */
  private getTrendExplanation(
    previousRisk: RiskLevel,
    currentRisk: RiskLevel,
    trend: 'up' | 'down' | 'stable' | 'unknown'
  ): string {
    if (trend === 'stable') {
      return `Risk level remains ${currentRisk}.`;
    }
    if (trend === 'up') {
      return `Risk increased from ${previousRisk} to ${currentRisk}. Closer monitoring recommended.`;
    }
    if (trend === 'down') {
      return `Risk decreased from ${previousRisk} to ${currentRisk}. Positive change detected.`;
    }
    return 'Unable to determine trend.';
  }

  /**
   * Build updated risk state
   */
  private buildRiskState(
    conversation_id: string,
    risk_level: RiskLevel,
    confidence: number,
    previousState: RiskState | undefined,
    explanation: string
  ): RiskState {
    const now = new Date().toISOString();
    const currentScore = RISK_LEVEL_SCORES[risk_level];
    const previousMaxScore = previousState
      ? RISK_LEVEL_SCORES[previousState.max_risk]
      : 0;

    // Track maximum risk seen in conversation
    const max_risk =
      currentScore > previousMaxScore
        ? risk_level
        : previousState?.max_risk || risk_level;

    // Track trend
    const trend = previousState
      ? this.calculateTrend(previousState.current_risk, risk_level)
      : ('unknown' as const);

    // Track if high risk was mentioned recently
    const last_high_risk_at =
      currentScore >= RISK_LEVEL_SCORES.high
        ? now
        : previousState?.last_high_risk_at || null;

    // Check if attempt was mentioned in explanation
    const attempt_mentioned =
      previousState?.attempt_mentioned ||
      /attempt|tried to|planning to/i.test(explanation);

    return {
      conversation_id,
      version: (previousState?.version || 0) + 1,
      max_risk,
      current_risk: risk_level,
      confidence,
      trend,
      last_high_risk_at,
      attempt_mentioned,
      safety_summary: explanation,
      updated_at: now,
    };
  }

  /**
   * Build required/recommended actions
   */
  private buildActions(risk_level: RiskLevel): {
    required: string[];
    recommended: string[];
  } {
    const actions = {
      required: [] as string[],
      recommended: [] as string[],
    };

    switch (risk_level) {
      case 'critical':
        actions.required.push('Show crisis resources prominently');
        actions.required.push('Log event for review');
        actions.required.push('Consider limiting further conversation');
        actions.recommended.push('Offer connection to human counselor');
        actions.recommended.push('Encourage immediate help-seeking');
        break;

      case 'high':
        actions.required.push('Show crisis resources');
        actions.required.push('Log event for review');
        actions.recommended.push('Encourage professional support');
        actions.recommended.push('Monitor conversation closely');
        break;

      case 'medium':
        actions.recommended.push('Show crisis resources');
        actions.recommended.push('Consider logging event');
        actions.recommended.push('Provide empathetic support');
        break;

      default:
        break;
    }

    return actions;
  }

  /**
   * Build behavioral constraints for assistant
   */
  private buildConstraints(risk_level: RiskLevel): {
    allow_method_details: boolean;
    allow_philosophical_debate: boolean;
    avoid_detailed_trauma_questions: boolean;
    use_safety_focused_responses: boolean;
  } {
    const isHighRisk = risk_level === 'high' || risk_level === 'critical';
    const isMediumPlus =
      risk_level === 'medium' || risk_level === 'high' || risk_level === 'critical';

    return {
      allow_method_details: !isMediumPlus,
      allow_philosophical_debate: !isHighRisk,
      avoid_detailed_trauma_questions: isMediumPlus,
      use_safety_focused_responses: isMediumPlus,
    };
  }

  /**
   * Build UI guidance
   */
  private buildUIGuidance(risk_level: RiskLevel): {
    show_crisis_resources: boolean;
    highlight_urgency: boolean;
    allow_further_chat: boolean;
    require_acknowledgement: boolean;
    limit_remaining_messages?: number;
  } {
    const isCritical = risk_level === 'critical';
    const isHighRisk = risk_level === 'high' || risk_level === 'critical';

    return {
      show_crisis_resources: shouldShowCrisisResources(risk_level),
      highlight_urgency: shouldHighlightUrgency(risk_level),
      allow_further_chat: !isCritical,
      require_acknowledgement: isHighRisk,
      limit_remaining_messages: isCritical ? 2 : undefined,
    };
  }
}
