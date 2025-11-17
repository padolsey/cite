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
export interface RiskState {
  conversation_id: string;
  version: number;
  max_risk: RiskLevel;
  current_risk: RiskLevel;
  confidence: number;
  trend: 'up' | 'down' | 'stable' | 'unknown';
  last_high_risk_at: string | null; // ISO timestamp
  attempt_mentioned: boolean;
  attempt_recent?: boolean;
  safety_summary?: string;
  updated_at: string; // ISO timestamp
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
   * Optional: Proposed assistant response to validate
   */
  assistant_candidate?: Message;
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

  // --- Advanced fields (progressive enhancement) ---

  /**
   * Specific risk types detected
   * Only present if requested or risk is medium+
   */
  risk_types?: RiskTypeResult[];

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
  assistant_reply?: {
    role: 'assistant';
    content: string;
    replaced_unsafe_content: boolean;
    replacement_reason?: string;
  };

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
