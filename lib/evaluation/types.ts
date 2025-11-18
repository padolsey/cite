/**
 * API Types for /v1/evaluate endpoint
 *
 * Designed for progressive enhancement:
 * - Simple by default (just messages + country)
 * - Complex features are optional
 */

import type { RiskLevel, RiskTypeResult } from '../classification/types/index.js';

/**
 * Message in conversation
 */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string; // ISO 8601
}

/**
 * Crisis resource
 */
export interface CrisisResource {
  type: 'emergency_number' | 'crisis_line' | 'text_line' | 'chat_service' | 'support_service';
  name: string;
  phone?: string;
  text_instructions?: string;
  chat_url?: string;
  availability?: string; // e.g., "24/7"
  languages?: string[]; // ISO language codes
  description?: string;
}

/**
 * Risk state (for conversation tracking)
 * Optional - only used if client sends previous state
 */
export type Trend = 'up' | 'down' | 'stable' | 'unknown';

export type DistressLevel = 'low' | 'moderate' | 'high' | 'extreme';

export type HelpSeekingOrientation =
  | 'actively_seeking_help'
  | 'ambivalent'
  | 'rejecting_help'
  | 'information_only';

export type EngagementLevel = 'low' | 'moderate' | 'high';

export interface RiskState {
  conversation_id: string;
  version: number;
  max_risk: RiskLevel;
  current_risk: RiskLevel;
  confidence: number;
  trend: Trend;
  last_high_risk_at: string | null; // ISO timestamp
  attempt_mentioned: boolean;
  attempt_recent?: boolean;
  safety_summary?: string;
  updated_at: string; // ISO timestamp
  // Progressive enhancement: distress and orientation fields
  max_distress_level?: DistressLevel;
  current_distress_level?: DistressLevel;
  distress_trend?: Trend;
  help_seeking_orientation?: HelpSeekingOrientation;
}

/**
 * Configuration (all optional for progressive enhancement)
 */
export interface EvaluateConfig {
  /**
   * User's country for crisis resources (ISO country code)
   * Optional - if not provided, will use language inference or global resources
   */
  user_country?: string;

  /**
   * Locale for language/region (e.g., "en-US", "es-MX")
   * Optional - if not provided, will attempt to infer from message content
   */
  locale?: string;

  /**
   * User age band (affects response templates)
   * Default: "adult"
   */
  user_age_band?: 'adult' | 'minor' | 'unknown';

  /**
   * Policy ID to use
   * Default: "default_mh"
   */
  policy_id?: string;

  /**
   * Dry run mode (evaluate but don't log/trigger webhooks)
   * Default: false
   */
  dry_run?: boolean;

  /**
   * Whether to return a safe assistant reply
   * Default: true
   */
  return_assistant_reply?: boolean;

  /**
   * How CITE should generate the recommended reply.
   *
   * - "template" (default): use static, pre-reviewed templates only.
   * - "llm_generate": use an LLM (via SAFE_RESPONSE_GENERATION) to generate
   *   a safe reply from scratch, using conversation context + crisis resources.
   * - "llm_validate": use an LLM to validate and, if needed, revise a
   *   client-provided candidate_reply into a safe version.
   *
   * NOTE: LLM-based modes are experimental and may change in future versions.
   */
  assistant_safety_mode?: 'template' | 'llm_generate' | 'llm_validate';

  /**
   * Use multiple judges for higher confidence
   * Default: false (single judge)
   */
  use_multiple_judges?: boolean;
}

/**
 * Request to /v1/evaluate
 *
 * Simple mode: Just messages + user_country
 * Advanced: Include conversation_id, risk_state, etc.
 */
export interface EvaluateRequest {
  /**
   * Conversation messages (full history or recent context)
   */
  messages: Message[];

  /**
   * Configuration
   */
  config: EvaluateConfig;

  /**
   * Optional: Conversation ID for tracking
   */
  conversation_id?: string;

  /**
   * Optional: Previous risk state (for trend detection)
   */
  risk_state?: RiskState;

  /**
   * Optional: Proposed assistant response from your system that you want
   * CITE to validate or improve. Not used in v1, reserved for future
   * assistant safety features.
   */
  candidate_reply?: Message;
}

/**
 * Response from /v1/evaluate
 *
 * Simple mode: Just risk_level, confidence, explanation, and crisis resources
 * Advanced: Includes risk_types, trend, state, actions, etc.
 */
export interface EvaluateResponse {
  /**
   * Overall risk level
   */
  risk_level: RiskLevel;

  /**
   * Confidence in classification (0.0-1.0)
   */
  confidence: number;

  /**
   * Human-readable explanation of risk assessment
   */
  explanation: string;

  /**
   * Whether to show crisis resources to user
   */
  show_crisis_resources: boolean;

  /**
   * Whether to highlight urgency in UI
   */
  highlight_urgency: boolean;

  /**
   * Whether assistant can discuss methods
   */
  allow_method_details: boolean;

  /**
   * Safe response to send to user
   * Only present if config.return_assistant_reply !== false
   */
  safe_reply?: string;

  /**
   * Crisis resources for user's region
   */
  crisis_resources: CrisisResource[];

  /**
   * Whether this event should be logged
   */
  log_recommended: boolean;

  /**
   * High-level coping / support categories recommended for this
   * conversation. These are intentionally coarse-grained so that
   * host applications can map them to locale- and culture-specific
   * UX (e.g., specific exercises, articles, or flows).
   *
   * NOTE: These are hints, not prescriptions, and are safe to ignore.
   */
  coping_recommendations?: Array<{
    /**
     * Coarse category of coping / support action being suggested.
     *
     * - "self_soothing": grounding, breathing, sensory calming, etc.
     * - "social_support": reaching out to trusted friends/family/other supporters.
     * - "professional_support": talking with clinicians, counselors, or helplines.
     * - "safety_planning": identifying warning signs, coping strategies, supports, reasons for living.
     * - "means_safety": reducing access to potential self-harm methods.
     */
    category:
      | 'self_soothing'
      | 'social_support'
      | 'professional_support'
      | 'safety_planning'
      | 'means_safety';

    /**
     * Risk level this recommendation is primarily tied to.
     * This helps integrators decide when to surface which actions.
     */
    risk_level: RiskLevel;
  }>;

  // --- Advanced fields (progressive enhancement) ---

  /**
   * Backwards-compatible alias for risk_types
   * Public API name used in v1 docs.
   */
  risk_tags?: RiskTypeResult[];

  /**
   * Specific risk types detected
   * Only present if requested or risk is medium+
   */
  risk_types?: RiskTypeResult[];

  /**
   * Recommended reply content to send back to the end user.
   *
   * This is the canonical field for "what should be said" after
   * applying CITE's safety logic. For v1 this is always template-based.
   */
  recommended_reply?: {
    content: string;
    /**
     * How this reply was produced:
     * - "template": from static, pre-reviewed templates (v1 default)
     * - "llm_generated": generated by an LLM (future/experimental)
     * - "llm_validated_candidate": LLM-validated version of a client candidate (future/experimental)
     */
    source: 'template' | 'llm_generated' | 'llm_validated_candidate';
    /**
     * Optional human-readable note about why a candidate was changed,
     * or other relevant context. Not populated in v1.
     */
    notes?: string;
  };

  /**
   * Overall distress level (emotional activation) independent of suicidality
   */
  distress_level?: DistressLevel;

  /**
   * Distress trend (if previous state provided)
   */
  distress_trend?: Trend;

  /**
   * User's stance toward help in this conversation
   */
  help_seeking_orientation?: HelpSeekingOrientation;

  /**
   * How engaged the user is with the assistant
   */
  engagement_level?: EngagementLevel;

  /**
   * Primary and secondary topics detected
   */
  primary_topics?: string[];
  secondary_topics?: string[];

  /**
   * High-level routing recommendation
   */
  recommended_routing?: 'no_escalation_needed'
    | 'non_urgent_support'
    | 'show_crisis_resources'
    | 'urgent_human_review'
    | 'immediate_human_intervention';

  /**
   * Escalation urgency for human review
   */
  escalation_urgency?: 'none' | 'routine' | 'urgent' | 'immediate';

  /**
   * Risk trend (if previous state provided)
   */
  trend?: 'up' | 'down' | 'stable' | 'unknown';

  /**
   * Explanation of trend
   */
  trend_explanation?: string;

  /**
   * Updated risk state (save this in your DB)
   */
  risk_state?: RiskState;

  /**
   * Required actions
   */
  actions?: {
    required: string[];
    recommended: string[];
  };

  /**
   * Behavioral constraints for assistant
   */
  constraints?: {
    allow_method_details: boolean;
    allow_philosophical_debate: boolean;
    avoid_detailed_trauma_questions: boolean;
    use_safety_focused_responses: boolean;
  };

  /**
   * UI guidance
   */
  ui_guidance?: {
    show_crisis_resources: boolean;
    highlight_urgency: boolean;
    allow_further_chat: boolean;
    require_acknowledgement: boolean;
    limit_remaining_messages?: number;
  };

  /**
   * Assistant reply with validation info
   * (if assistant_candidate was provided)
   */
  // Reserved for future versions; not used in v1.

  /**
   * Judge agreement metric (if multiple judges used)
   */
  agreement?: number;

  /**
   * Debug information (internal testing/development)
   * Includes raw LLM payloads sent to providers
   */
  debug_info?: {
    llm_requests?: Array<{
      provider: string;
      model: string;
      request_payload: any;
      response_raw?: any;
    }>;
  };
}
