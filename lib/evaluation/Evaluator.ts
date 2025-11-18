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

import type {
  EvaluateRequest,
  EvaluateResponse,
  RiskState,
  DistressLevel,
  Trend,
} from './types.js';
import type { RiskLevel, RiskTypeResult } from '../classification/types/index.js';
import { RiskClassifier } from '../classification/RiskClassifier.js';
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
}

/**
 * Evaluator orchestrates safety evaluation
 */
export class Evaluator {
  private classifier: RiskClassifier;
  private resourceResolver: IResourceResolver;

  constructor(dependencies: EvaluatorDependencies) {
    this.classifier = dependencies.classifier;
    this.resourceResolver = dependencies.resourceResolver;
  }

  /**
   * Evaluate conversation for safety risks
   */
  async evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
    const { messages, config, risk_state: previousState, conversation_id } = request;

    // 1. Classify risk level (includes language detection)
    const classification = await this.classifier.classifyRisk(messages, true); // Include debug info
    const {
      risk_level,
      confidence,
      explanation,
      agreement,
      language,
      locale,
      risk_types,
      debug_requests,
    } = classification;

    // 2. Generate recommended reply (if requested)
    const recommendedReplyText = config.return_assistant_reply !== false
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
      crisis_resources,
      log_recommended: shouldLogEvent(risk_level),
    };
    // Backwards-compatible alias for template-based reply
    if (recommendedReplyText !== undefined) {
      response.recommended_reply = {
        content: recommendedReplyText,
        source: 'template',
      };
      // Deprecated v1 field, kept for compatibility with existing clients/tests
      (response as any).safe_reply = recommendedReplyText;
    }

    // 5. Progressive enhancement: risk types (from same LLM call, for medium+ risk)
    const isMediumPlus =
      risk_level === 'medium' || risk_level === 'high' || risk_level === 'critical';
    if (isMediumPlus && risk_types && risk_types.length > 0) {
      response.risk_types = risk_types;
      response.risk_tags = risk_types;
    }

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

      // Distress trend (if previous distress_level available)
      const prevDistress = previousState.current_distress_level;
      const currentDistress = this.getDistressLevel(risk_level, risk_types);
      response.distress_level = currentDistress;
      if (prevDistress) {
        const distressTrend = this.calculateDistressTrend(prevDistress, currentDistress);
        response.distress_trend = distressTrend;
      }
    } else {
      // No previous state - still compute current distress_level
      response.distress_level = this.getDistressLevel(risk_level, risk_types);
    }

    // Updated risk state (if conversation tracking enabled)
    if (conversation_id) {
      response.risk_state = this.buildRiskState(
        conversation_id,
        risk_level,
        confidence,
        previousState,
        explanation,
        response.distress_level
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

    // Routing + escalation urgency (always present)
    response.recommended_routing = this.getRecommendedRouting(risk_level);
    response.escalation_urgency = this.getEscalationUrgency(risk_level);

    // Agreement metric (if multiple judges used)
    if (agreement !== undefined) {
      response.agreement = agreement;
    }

    // Debug info (LLM requests)
    if (debug_requests && debug_requests.length > 0) {
      response.debug_info = {
        llm_requests: debug_requests.map(req => ({
          provider: 'openrouter',
          model: req.model,
          request_payload: {
            model: req.model,
            messages: [
              { role: 'system', content: req.systemPrompt },
              ...req.messages
            ],
            temperature: req.temperature,
            max_tokens: req.maxTokens,
            stream: true,
          },
        })),
      };
    }

    return response;
  }

  /**
   * Calculate risk trend
   */
  private calculateTrend(
    previousRisk: RiskLevel,
    currentRisk: RiskLevel
  ): Trend {
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
    trend: Trend
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
    explanation: string,
    currentDistress: DistressLevel | undefined
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

    // Distress levels and trend
    const prevMaxDistressScore = previousState?.max_distress_level
      ? this.distressToScore(previousState.max_distress_level)
      : 0;
    const currentDistressScore = currentDistress
      ? this.distressToScore(currentDistress)
      : 0;

    const max_distress_level: DistressLevel | undefined =
      currentDistressScore > prevMaxDistressScore
        ? currentDistress
        : previousState?.max_distress_level;

    const distress_trend: Trend | undefined =
      previousState?.current_distress_level && currentDistress
        ? this.calculateDistressTrend(
            previousState.current_distress_level,
            currentDistress
          )
        : undefined;

    return {
      conversation_id,
      version: (previousState?.version || 0) + 1,
      max_risk,
      current_risk: risk_level,
      confidence,
      trend,
      last_high_risk_at,
      attempt_mentioned,
      max_distress_level,
      current_distress_level: currentDistress,
      distress_trend,
      safety_summary: explanation,
      updated_at: now,
    };
  }

  /**
   * Map risk level and risk types to an overall distress level
   * (heuristic v1 implementation).
   */
  private getDistressLevel(
    risk_level: RiskLevel,
    risk_types: RiskTypeResult[] | undefined
  ): DistressLevel {
    const types = risk_types ?? [];
    const hasSevereDepression = types.some(t => t.type === 'severe_depression_indicators');
    const hasPanic = types.some(t => t.type === 'anxiety_panic_indicators');
    const hasGeneralDistress = types.some(t => t.type === 'general_distress');

    switch (risk_level) {
      case 'critical':
        return 'extreme';
      case 'high':
        return 'high';
      case 'medium':
        if (hasSevereDepression || hasPanic) return 'high';
        return 'moderate';
      case 'low':
        if (hasSevereDepression || hasPanic || hasGeneralDistress) return 'moderate';
        return 'low';
      case 'none':
      default:
        return hasGeneralDistress ? 'moderate' : 'low';
    }
  }

  /**
   * Convert distress level to numeric score for trend calculation.
   */
  private distressToScore(level: DistressLevel | undefined): number {
    switch (level) {
      case 'low':
        return 0.25;
      case 'moderate':
        return 0.5;
      case 'high':
        return 0.75;
      case 'extreme':
        return 1.0;
      default:
        return 0;
    }
  }

  /**
   * Calculate distress trend between two levels.
   */
  private calculateDistressTrend(
    previous: DistressLevel,
    current: DistressLevel
  ): Trend {
    const prevScore = this.distressToScore(previous);
    const currScore = this.distressToScore(current);

    if (currScore > prevScore) return 'up';
    if (currScore < prevScore) return 'down';
    return 'stable';
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

  /**
   * Map risk level to recommended routing.
   */
  private getRecommendedRouting(
    risk_level: RiskLevel
  ): EvaluateResponse['recommended_routing'] {
    switch (risk_level) {
      case 'critical':
        return 'immediate_human_intervention';
      case 'high':
        return 'urgent_human_review';
      case 'medium':
        return 'show_crisis_resources';
      case 'low':
        return 'non_urgent_support';
      case 'none':
      default:
        return 'no_escalation_needed';
    }
  }

  /**
   * Map risk level to escalation urgency.
   */
  private getEscalationUrgency(
    risk_level: RiskLevel
  ): EvaluateResponse['escalation_urgency'] {
    switch (risk_level) {
      case 'critical':
        return 'immediate';
      case 'high':
        return 'urgent';
      case 'medium':
        return 'routine';
      case 'low':
      case 'none':
      default:
        return 'none';
    }
  }
}
