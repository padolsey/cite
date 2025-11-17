/**
 * Classification types for CITE Safety API
 *
 * Designed for extensibility - new risk levels and types
 * can be added without breaking existing code
 */

/**
 * Risk levels (extensible)
 * Core levels: none, low, medium, high, critical
 * Future levels can be added by extending this union
 */
export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Risk type identifiers (extensible)
 * Based on C-SSRS, SITBI, DSM-5 criteria
 */
export type RiskType =
  // Suicidal ideation (C-SSRS levels 1-5)
  | 'self_harm_passive_ideation' // C-SSRS Level 1
  | 'self_harm_active_ideation_non_specific' // C-SSRS Level 2
  | 'self_harm_active_ideation_method' // C-SSRS Level 3
  | 'self_harm_active_ideation_intent' // C-SSRS Level 4
  | 'self_harm_active_ideation_plan' // C-SSRS Level 5
  | 'self_harm_preparatory_acts' // C-SSRS: preparatory behaviors
  | 'self_harm_past_attempt' // C-SSRS: past attempts
  | 'self_harm_instruction_request' // Asking about methods

  // Non-suicidal self-injury (SITBI)
  | 'nssi_thoughts' // NSSI thoughts without suicidal intent
  | 'nssi_behavior' // NSSI behaviors

  // Psychosis (DSM-5)
  | 'psychosis_delusions' // Fixed false beliefs
  | 'psychosis_hallucinations' // Perceptual disturbances
  | 'psychosis_disorganized_speech' // Thought disorder

  // Mania (DSM-5)
  | 'mania_indicators' // Grandiosity, decreased sleep need, etc.

  // Eating disorders (DSM-5)
  | 'eating_disorder_indicators' // Restriction, binge-purge, etc.

  // Substance use (CAGE)
  | 'substance_misuse_indicators' // Problematic use patterns

  // Other
  | 'severe_depression_indicators' // Hopelessness, worthlessness
  | 'anxiety_panic_indicators' // Severe anxiety/panic
  | 'general_distress' // Non-specific distress

  // Meta
  | 'mh_topic_academic' // Academic discussion
  | 'joking_or_ambiguous'; // Unclear intent

/**
 * Risk type with confidence score
 */
export interface RiskTypeResult {
  type: RiskType;
  confidence: number; // 0.0 - 1.0
}

/**
 * Classification scale mapping
 * Maps classification names to risk levels and confidence scores
 */
export const CLASSIFICATION_SCALES = {
  CLASS_NONE: { level: 'none' as const, confidence: 1.0 },
  CLASS_LOW: { level: 'low' as const, confidence: 0.75 },
  CLASS_MEDIUM: { level: 'medium' as const, confidence: 0.75 },
  CLASS_HIGH: { level: 'high' as const, confidence: 0.85 },
  CLASS_CRITICAL: { level: 'critical' as const, confidence: 0.9 },
} as const;

/**
 * Classification name from prompt
 */
export type ClassificationName = keyof typeof CLASSIFICATION_SCALES;

/**
 * Risk level scores for numeric operations
 * Used for trending, averaging, etc.
 */
export const RISK_LEVEL_SCORES: Record<RiskLevel, number> = {
  none: 0.0,
  low: 0.25,
  medium: 0.5,
  high: 0.75,
  critical: 1.0,
};

/**
 * Convert score to risk level
 */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score < 0.15) return 'none';
  if (score < 0.4) return 'low';
  if (score < 0.65) return 'medium';
  if (score < 0.85) return 'high';
  return 'critical';
}

/**
 * Result from a risk level classification
 */
export interface RiskLevelResult {
  level: RiskLevel;
  confidence: number; // 0.0 - 1.0
  reflection: string; // Explanation from LLM
  language?: string; // ISO 639-1 language code (e.g., 'en', 'es', 'pt')
  locale?: string; // Locale string (e.g., 'en-US', 'es-MX', 'pt-BR')
  /**
   * Specific risk types detected in the conversation
   * Combined output from the same LLM call (no separate "types" pass)
   */
  risk_types?: RiskTypeResult[];
}

/**
 * Configuration for classification
 */
export interface ClassificationConfig {
  /**
   * Whether to use multiple judges for consensus
   * Default: false (single judge)
   */
  useMultipleJudges?: boolean;

  /**
   * Number of judges to use (if useMultipleJudges is true)
   * Default: 3
   */
  judgeCount?: number;

  /**
   * Models to use for judges
   * Default: ['anthropic/claude-haiku-4.5']
   */
  models?: string[];
}
