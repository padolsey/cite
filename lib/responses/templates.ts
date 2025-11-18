/**
 * Safe Response Templates - Evidence-Based Version
 *
 * Informed by:
 * - SAMHSA SAFE-T Protocol
 * - VA/DOD Clinical Practice Guidelines 2024
 * - WHO Digital Mental Health Guidelines
 * - NIMH Crisis Response Best Practices
 *
 * Note: Crisis resources are injected separately based on user locale
 */

import type { RiskLevel, RiskLevelResult } from '../classification/types/index.js';

export const RESPONSE_TEMPLATES: Record<
  RiskLevel,
  { adult: string; minor: string }
> = {
  /**
   * NONE risk - Open, warm, non-assumptive
   * Evidence: Avoid making assumptions, maintain warmth (WHO guidelines)
   */
  none: {
    adult: 
      "I'm here to listen and support you. What's on your mind today?",
    minor: 
      "Hi there, I'm here to listen. What would you like to talk about?",
  },

  /**
   * LOW risk - Validate, normalize, gentle support
   * Evidence: Validation crucial (multiple studies), normalize help-seeking
   */
  low: {
    adult:
      "Thank you for sharing this with me. It sounds like you're dealing with something really challenging, and it makes complete sense that you'd feel this way.\n\n" +
      "You're taking a positive step by reaching out. If you'd find it helpful, talking with a counselor or therapist can provide additional support.\n\n" +
      "What's been weighing on you the most?",
    
    minor:
      "Thank you for trusting me with this. What you're going through sounds really hard, and your feelings make total sense.\n\n" +
      "You're being really brave by talking about it. Sometimes sharing with a trusted adult - like a parent, school counselor, or teacher - can help you feel less alone.\n\n" +
      "Can you tell me more about what's been happening?",
  },

  /**
   * MEDIUM risk - Validate pain, explore protective factors, provide options
   * Evidence: Safety planning, protective factors assessment (SAFE-T)
   */
  medium: {
    adult:
      "I can hear how much pain you're in right now, and I'm genuinely concerned about you. What you're feeling is real and it matters.\n\n" +
      "I want to help you stay safe. Some things that might help:\n" +
      "• Reaching out to someone you trust who you could talk to or be with today\n" +
      "• Contacting a crisis support line for immediate help\n" +
      "• Speaking with your doctor or a therapist for ongoing support\n\n" +
      "You mentioned feeling this way - can you tell me what's been happening that brought you to this point?",
    
    minor:
      "I'm really concerned about what you're going through. Your feelings are important, and you deserve support.\n\n" +
      "Right now, it's really important to:\n" +
      "• Talk to a trusted adult today - a parent, guardian, teacher, or counselor\n" +
      "• Know that crisis support is available anytime you need it\n" +
      "• Remember that these feelings can change with the right help\n\n" +
      "You're not alone in this. What's been making things feel so hard lately?",
  },

  /**
   * HIGH risk - Express serious concern, safety focus, immediate resources
   * Evidence: Clear concern without panic, immediate support emphasis (VA/DOD)
   */
  high: {
    adult:
      "What you're describing worries me deeply, and I want you to know that your life has value and meaning, even when everything feels impossible.\n\n" +
      "Please reach out for immediate support through:\n" +
      "• A crisis helpline - trained counselors are available 24/7\n" +
      "• Your local emergency services if you feel unsafe\n" +
      "• A trusted friend or family member who can be with you\n\n" +
      "You don't have to go through this alone. Help is available right now.\n\n" +
      "Can you tell me: Are you in a safe place? Is there someone who could be with you?",
    
    minor:
      "I'm very worried about you right now. What you're feeling is serious, and you need and deserve help immediately.\n\n" +
      "Please do ONE of these RIGHT NOW:\n" +
      "• Tell a parent or trusted adult what you just told me\n" +
      "• Contact a crisis support line - they help young people every day\n" +
      "• Go to an emergency room with a trusted adult if you feel unsafe\n" +
      "• Call emergency services if you're in immediate danger\n\n" +
      "You are NOT a burden. Adults want to help you. Your life matters.\n\n" +
      "Can you tell me: Are you safe right now? Is there an adult nearby?",
  },

  /**
   * CRITICAL risk - Immediate intervention focus, clear urgency, multiple options
   * Evidence: No-wrong-door approach, immediate safety (SAMHSA guidelines)
   */
  critical: {
    adult:
      "I'm extremely concerned about your immediate safety. What you're describing is an emergency, and you deserve immediate help and support.\n\n" +
      "**TAKE ACTION NOW - Choose what feels most possible:**\n\n" +
      "• **Contact** a crisis helpline immediately - they're waiting to help\n" +
      "• **Go** to your nearest emergency room\n" +
      "• **Call** emergency services and tell them it's a mental health emergency\n" +
      "• **Reach out** to someone you trust to be with you right now\n\n" +
      "Your pain is real, but it can change. You deserve to live and to feel better than this.\n\n" +
      "I need to know: Are you safe in this moment? Have you done anything to hurt yourself? Is someone with you?",
    
    minor:
      "I am extremely worried about you. This is an emergency and you need help RIGHT NOW.\n\n" +
      "**DO THIS IMMEDIATELY:**\n\n" +
      "• **TELL** a parent or adult RIGHT NOW - show them this message\n" +
      "• **CONTACT** a crisis helpline - say \"I need help, I'm not safe\"\n" +
      "• **GO** to an emergency room with an adult\n" +
      "• **CALL** emergency services - say \"I need help, I'm having a mental health emergency\"\n\n" +
      "You are NOT alone. You are NOT a burden. Adults WANT to help you. Your life is precious.\n\n" +
      "Please tell me: Are you safe right now? Have you hurt yourself? Can you get to an adult?",
  },
};

/**
 * Enhanced helper functions based on evidence
 */

/**
 * Get follow-up prompts based on risk level
 * Evidence: Gentle exploration without interrogation (VA/DOD guidelines)
 */
export function getFollowUpPrompts(risk_level: RiskLevel): string[] {
  const prompts: Record<RiskLevel, string[]> = {
    none: [
      "How has your day been?",
      "What brings you here today?"
    ],
    low: [
      "How long have you been feeling this way?",
      "What usually helps when you feel like this?",
      "Who in your life provides support?"
    ],
    medium: [
      "What's helping you cope right now?",
      "Who knows about how you're feeling?",
      "What has kept you going despite these feelings?"
    ],
    high: [
      "Have you talked to anyone about these feelings?",
      "What has stopped you from acting on these thoughts?",
      "What would need to change for you to feel safer?"
    ],
    critical: [
      "Can someone come be with you right now?",
      "Have you taken any steps to hurt yourself?",
      "Will you contact crisis support while we're talking?"
    ]
  };
  return prompts[risk_level];
}

/**
 * Get protective factor prompts
 * Evidence: SAFE-T protocol emphasizes identifying protective factors
 */
export function getProtectiveFactorPrompts(age_band: 'adult' | 'minor'): string[] {
  if (age_band === 'minor') {
    return [
      "Who are the adults in your life who care about you?",
      "What activities or hobbies do you enjoy?",
      "What are you looking forward to, even small things?",
      "Who would miss you if you weren't here?"
    ];
  }
  return [
    "What people or relationships are important to you?",
    "What beliefs or values give you strength?",
    "What responsibilities or roles keep you going?",
    "What has helped you through difficult times before?"
  ];
}

/**
 * Get means safety messaging
 * Evidence: Lethal means counseling is evidence-based intervention
 */
export function getMeansSafetyMessage(
  risk_level: RiskLevel, 
  age_band: 'adult' | 'minor'
): string | null {
  if (risk_level === 'none' || risk_level === 'low') return null;
  
  if (age_band === 'minor') {
    return "If there are things around that could be used for self-harm, please give them to a trusted adult to keep safe.";
  }
  return "If you have access to means of self-harm, please consider removing them or asking someone to hold them temporarily.";
}

/**
 * Get validation phrases based on presentation
 * Evidence: Validation without minimization crucial for engagement
 */
export function getValidationPhrases(): string[] {
  return [
    "Your feelings are valid and understandable",
    "It takes courage to reach out",
    "You're not alone in feeling this way",
    "This pain won't last forever, even though it feels that way now",
    "You deserve support and compassion",
    "Thank you for trusting me with this",
    "Your struggles are real and they matter",
    "It makes sense you'd feel this way given what you're going through",
    "You're showing strength by talking about this",
    "Many people have felt this way and found their way through"
  ];
}

/**
 * Get strength-based observations
 * Evidence: Identifying existing strengths improves outcomes
 */
export function getStrengthObservations(risk_level: RiskLevel): string[] {
  const observations: Record<RiskLevel, string[]> = {
    none: [],
    low: [
      "You're taking care of yourself by reaching out",
      "You're aware of what you're feeling"
    ],
    medium: [
      "You're still here despite these difficult feelings",
      "You're looking for ways to cope",
      "You haven't given up"
    ],
    high: [
      "You're reaching out even though it's hard",
      "Something has kept you fighting",
      "You're still looking for help"
    ],
    critical: [
      "You're here talking to me right now",
      "Part of you wants to survive this",
      "You're giving help a chance"
    ]
  };
  return observations[risk_level];
}

/**
 * Safety planning components (locale-agnostic)
 * Evidence: Stanley-Brown Safety Plan structure
 */
export function getSafetyPlanPrompts(age_band: 'adult' | 'minor'): string[] {
  const base = [
    "What warning signs tell you things are getting difficult?",
    "What helps you feel calmer or safer?",
    "Who can you reach out to when you need support?",
    "What reasons for living are important to you?"
  ];
  
  if (age_band === 'minor') {
    return [
      ...base,
      "Which adults in your life can you trust to help?",
      "What activities or places help you feel better?"
    ];
  }
  
  return [
    ...base,
    "What environments or situations should you avoid when struggling?",
    "How can you make your space safer?"
  ];
}

/**
 * Response tone modifiers based on risk
 * Evidence: Matching urgency to actual risk level
 */
export function getToneModifiers(risk_level: RiskLevelResult): {
  pace: 'relaxed' | 'measured' | 'urgent';
  warmth: 'high' | 'balanced' | 'serious';
  directiveness: 'low' | 'moderate' | 'high';
} {
  const modifiers = {
    none: { pace: 'relaxed', warmth: 'high', directiveness: 'low' },
    low: { pace: 'relaxed', warmth: 'high', directiveness: 'low' },
    medium: { pace: 'measured', warmth: 'balanced', directiveness: 'moderate' },
    high: { pace: 'measured', warmth: 'balanced', directiveness: 'high' },
    critical: { pace: 'urgent', warmth: 'serious', directiveness: 'high' }
  } as const;
  
  return modifiers[risk_level.level as RiskLevel];
}


/**
 * Get safe response for risk level and age band
 *
 * @param risk_level - Risk classification level
 * @param age_band - User age band (adult/minor/unknown)
 * @param language - Optional ISO language code (e.g., 'es', 'fr', 'zh')
 *                   If provided and translations exist, returns localized response
 *                   Falls back to English if language not supported
 */
export function getSafeResponse(
  risk_level: RiskLevel,
  age_band: 'adult' | 'minor' | 'unknown' = 'adult',
  language?: string
): string {
  const ageBand = age_band === 'minor' ? 'minor' : 'adult';

  // If language specified, try to use multilingual templates
  if (language) {
    try {
      // Lazy-load multilingual templates (only if they exist)
      const { getMultilingualSafeResponse } = require('./templates.multilingual.js');
      return getMultilingualSafeResponse(risk_level, age_band, language);
    } catch (error) {
      // Multilingual templates not built yet - fall back to English
      console.warn('Multilingual templates not available, using English fallback. Run: pnpm build:translations');
    }
  }

  // Default: Use English templates
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
