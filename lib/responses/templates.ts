/**
 * Safe Response Templates
 *
 * Template-based responses (not LLM-generated) for:
 * - Speed and cost efficiency
 * - Predictability
 * - Easy review for safety
 * - Consistent messaging
 *
 * Templates are selected based on:
 * - Risk level (none/low/medium/high/critical)
 * - Age band (adult/minor)
 */

import type { RiskLevel } from '../classification/types/index.js';

/**
 * Response templates by risk level and age band
 */
export const RESPONSE_TEMPLATES: Record<
  RiskLevel,
  { adult: string; minor: string }
> = {
  /**
   * NONE risk - General, helpful response
   */
  none: {
    adult: "I'm here to help. What would you like to talk about?",
    minor: "I'm here to help. What would you like to talk about?",
  },

  /**
   * LOW risk - Empathetic listening, normalize seeking help
   */
  low: {
    adult:
      "I hear you—that sounds really difficult. It's okay to feel overwhelmed sometimes. If you'd like professional support, consider reaching out to a therapist or counselor. What's been going on?",
    minor:
      "I hear you—that sounds really tough. It's okay to feel this way, and you're not alone. Talking to a trusted adult (like a parent, teacher, or school counselor) can really help. What's been happening?",
  },

  /**
   * MEDIUM risk - Show concern, provide resources, gentle exploration
   */
  medium: {
    adult:
      "I hear that you're struggling, and I want you to know that what you're feeling matters. If these thoughts become more intense or you start thinking about a plan, please reach out to the 988 Lifeline (call or text 988).\n\nWould you like to talk about what's been happening?",
    minor:
      "I'm worried about you. What you're feeling is serious, and it's really important to talk to someone who can help.\n\nPlease:\n1. Tell a trusted adult (parent, teacher, school counselor)\n2. Call or text 988 (free and confidential, 24/7)\n\nYou're not alone. Can you tell me what's been going on?",
  },

  /**
   * HIGH risk - Serious concern, prominent resources, avoid method details
   */
  high: {
    adult:
      "I'm very concerned about what you're sharing. Your life matters, and help is available right now.\n\nPlease contact the 988 Suicide & Crisis Lifeline immediately by calling or texting 988. They have trained counselors available 24/7 who can help you through this.\n\nAre you somewhere safe right now?",
    minor:
      "I'm really worried about you. What you're feeling is very serious, and you need help right now—not tomorrow, not later, but right now.\n\nPlease:\n1. Tell a parent or trusted adult immediately\n2. Call or text 988 (Suicide & Crisis Lifeline, free, 24/7)\n3. If you feel you might hurt yourself, call 911 or go to an emergency room\n\nYou matter. You're not a burden. Please reach out right now. Are you somewhere safe?",
  },

  /**
   * CRITICAL risk - Urgent, direct, immediate intervention
   */
  critical: {
    adult:
      "I'm very concerned about your immediate safety. What you're describing sounds incredibly painful, and I need you to know that help is available right now.\n\n🚨 IMMEDIATE HELP:\n• Call 988 Suicide & Crisis Lifeline (call or text 988)\n• If you are in immediate danger, call 911\n• Go to your nearest emergency room\n\nPlease reach out to one of these resources in the next few minutes. Your life has value.\n\nAre you somewhere safe right now? Is there someone with you?",
    minor:
      "I'm very worried about you right now. You need help immediately—not later, right NOW.\n\n🚨 DO THIS RIGHT NOW:\n1. Tell an adult (parent, teacher, school counselor) IMMEDIATELY\n2. Call 988 (Suicide & Crisis Lifeline) - free, confidential, 24/7\n3. If you feel unsafe, call 911 or go to an emergency room\n\nYou are NOT a burden. You matter. People want to help you.\n\nPlease reach out in the next few minutes. Are you safe right now? Is someone with you?",
  },
};

/**
 * Get safe response for risk level and age band
 */
export function getSafeResponse(
  risk_level: RiskLevel,
  age_band: 'adult' | 'minor' | 'unknown' = 'adult'
): string {
  const ageBand = age_band === 'minor' ? 'minor' : 'adult';
  return RESPONSE_TEMPLATES[risk_level][ageBand];
}

/**
 * Determine if crisis resources should be shown
 */
export function shouldShowCrisisResources(risk_level: RiskLevel): boolean {
  return risk_level === 'medium' || risk_level === 'high' || risk_level === 'critical';
}

/**
 * Determine if urgency should be highlighted in UI
 */
export function shouldHighlightUrgency(risk_level: RiskLevel): boolean {
  return risk_level === 'high' || risk_level === 'critical';
}

/**
 * Determine if method details should be allowed
 */
export function allowMethodDetails(risk_level: RiskLevel): boolean {
  // Never allow method details for medium+ risk
  return risk_level === 'none' || risk_level === 'low';
}

/**
 * Determine if event should be logged
 */
export function shouldLogEvent(risk_level: RiskLevel): boolean {
  // Log medium+ events for audit trail
  return risk_level === 'medium' || risk_level === 'high' || risk_level === 'critical';
}
