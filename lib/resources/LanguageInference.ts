/**
 * Language Inference
 *
 * Infers country codes from user context (explicit country, locale, message content)
 * Used for resolving region-specific crisis resources
 *
 * Current implementation: Simple passthrough for explicit country codes
 * Future: Could analyze message language, locale patterns, etc.
 */

import type { Message } from '../evaluation/types.js';

/**
 * Resolve country codes from available context
 *
 * @param userCountry - Explicitly provided country code (e.g., "US", "GB")
 * @param locale - User locale (e.g., "en-US", "en-GB")
 * @param messages - Conversation messages (for potential language detection)
 * @returns Array of country codes (prioritized by confidence)
 */
export function resolveCountryCodes(
  userCountry?: string,
  locale?: string,
  messages?: Message[]
): string[] {
  const codes: string[] = [];

  // 1. Explicit country code (highest confidence)
  if (userCountry) {
    codes.push(userCountry.toUpperCase());
  }

  // 2. Extract from locale (e.g., "en-US" → "US")
  if (locale && locale.includes('-')) {
    const localeCountry = locale.split('-')[1]?.toUpperCase();
    if (localeCountry && !codes.includes(localeCountry)) {
      codes.push(localeCountry);
    }
  }

  // 3. Message content analysis (future enhancement)
  // Could detect language patterns, phone number formats, cultural references, etc.
  // For now, not implemented

  return codes;
}
