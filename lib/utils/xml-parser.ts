/**
 * Robust XML Tag Extraction Utility
 *
 * LLMs are imperfect - they may return inconsistent formatting:
 * - Case variations: <Language>, <LANGUAGE>, <language>
 * - Spacing: <language > vs <language>
 * - Missing tags entirely
 * - Invalid values
 *
 * This utility provides flexible, fault-tolerant parsing.
 */

export interface ExtractedTag {
  value: string | undefined;
  found: boolean;
}

/**
 * Extract a single XML tag value with flexible matching
 *
 * Features:
 * - Case-insensitive tag matching
 * - Handles extra whitespace in tags
 * - Trims extracted values
 * - Returns undefined if tag not found
 *
 * @param text - The text to search
 * @param tagName - The tag name (case-insensitive)
 * @returns Extracted value or undefined
 */
export function extractTag(text: string, tagName: string): string | undefined {
  // Case-insensitive regex with optional whitespace
  // Matches: <tagname>, <TagName>, <TAGNAME>, < tagname >, etc.
  const pattern = new RegExp(
    `<\\s*${tagName}\\s*>\\s*(.*?)\\s*<\\s*\\/\\s*${tagName}\\s*>`,
    'is' // i = case-insensitive, s = dotall (. matches newlines)
  );

  const match = text.match(pattern);
  const value = match?.[1]?.trim();

  return value && value.length > 0 ? value : undefined;
}

/**
 * Extract a tag with detailed result info
 */
export function extractTagDetailed(text: string, tagName: string): ExtractedTag {
  const value = extractTag(text, tagName);
  return {
    value,
    found: value !== undefined,
  };
}

/**
 * Extract multiple tags at once
 *
 * @param text - The text to search
 * @param tagNames - Array of tag names to extract
 * @returns Object with tag names as keys, values as extracted content
 */
export function extractTags(
  text: string,
  tagNames: string[]
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};

  for (const tagName of tagNames) {
    result[tagName] = extractTag(text, tagName);
  }

  return result;
}

/**
 * Validate and normalize ISO 639-1 language code
 *
 * Handles:
 * - Case variations (EN, en, En)
 * - Common mistakes (english -> en)
 * - Invalid codes (returns undefined)
 *
 * @param code - The language code to validate
 * @returns Normalized lowercase code or undefined if invalid
 */
export function normalizeLanguageCode(code: string | undefined): string | undefined {
  if (!code) return undefined;

  const normalized = code.toLowerCase().trim();

  // ISO 639-1 codes are exactly 2 characters
  if (normalized.length === 2 && /^[a-z]{2}$/.test(normalized)) {
    return normalized;
  }

  // Common mistakes: full language names
  const languageMap: Record<string, string> = {
    english: 'en',
    spanish: 'es',
    french: 'fr',
    german: 'de',
    portuguese: 'pt',
    italian: 'it',
    japanese: 'ja',
    chinese: 'zh',
    korean: 'ko',
    russian: 'ru',
    arabic: 'ar',
    hindi: 'hi',
    dutch: 'nl',
    polish: 'pl',
    turkish: 'tr',
    vietnamese: 'vi',
    thai: 'th',
    swedish: 'sv',
    danish: 'da',
    finnish: 'fi',
    greek: 'el',
    hebrew: 'he',
    indonesian: 'id',
    malay: 'ms',
  };

  return languageMap[normalized];
}

/**
 * Validate and normalize locale string
 *
 * Handles:
 * - Case variations (en-us, EN-US, en-US)
 * - Missing hyphens (enus -> en-US)
 * - Invalid formats (returns undefined)
 *
 * Expected format: language-COUNTRY (e.g., en-US, es-MX, pt-BR)
 *
 * @param locale - The locale string to validate
 * @returns Normalized locale (lowercase-UPPERCASE) or undefined if invalid
 */
export function normalizeLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;

  const trimmed = locale.trim();

  // Handle with hyphen: en-US, en-us, EN-US
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 2) {
      const lang = parts[0].toLowerCase();
      const country = parts[1].toUpperCase();

      // Validate format
      if (/^[a-z]{2}$/.test(lang) && /^[A-Z]{2}$/.test(country)) {
        return `${lang}-${country}`;
      }
    }
  }

  // Handle without hyphen: enus, enUS, ENUS (assume first 2 chars are language)
  if (trimmed.length === 4 && /^[a-zA-Z]{4}$/.test(trimmed)) {
    const lang = trimmed.substring(0, 2).toLowerCase();
    const country = trimmed.substring(2).toUpperCase();
    return `${lang}-${country}`;
  }

  // Handle with underscore: en_US
  if (trimmed.includes('_')) {
    const parts = trimmed.split('_');
    if (parts.length === 2) {
      const lang = parts[0].toLowerCase();
      const country = parts[1].toUpperCase();

      if (/^[a-z]{2}$/.test(lang) && /^[A-Z]{2}$/.test(country)) {
        return `${lang}-${country}`;
      }
    }
  }

  return undefined;
}

/**
 * Validate and normalize country code
 *
 * @param code - The country code to validate (ISO 3166-1 alpha-2)
 * @returns Normalized uppercase code or undefined if invalid
 */
export function normalizeCountryCode(code: string | undefined): string | undefined {
  if (!code) return undefined;

  const normalized = code.toUpperCase().trim();

  // ISO 3166-1 alpha-2 codes are exactly 2 characters
  if (normalized.length === 2 && /^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }

  return undefined;
}

/**
 * Extract and normalize language from LLM response
 *
 * Combines extraction + normalization with fallback handling
 */
export function extractLanguage(text: string): string | undefined {
  const raw = extractTag(text, 'language');
  return normalizeLanguageCode(raw);
}

/**
 * Extract and normalize locale from LLM response
 *
 * Combines extraction + normalization with fallback handling
 */
export function extractLocale(text: string): string | undefined {
  const raw = extractTag(text, 'locale');
  return normalizeLocale(raw);
}

/**
 * Extract classification name with case normalization
 *
 * Handles: class_none, CLASS_NONE, Class_None
 * Returns: CLASS_NONE (standard format)
 */
export function extractClassification(text: string): string | undefined {
  const raw = extractTag(text, 'classification');
  if (!raw) return undefined;

  // Normalize to uppercase with underscores
  return raw.toUpperCase().replace(/\s+/g, '_');
}

/**
 * Parse risk types from XML
 *
 * Example:
 * <risk_types>
 *   <type name="self_harm_passive_ideation" confidence="0.9" />
 *   <type name="severe_depression_indicators" confidence="0.7" />
 * </risk_types>
 */
export function extractRiskTypes(text: string): Array<{ type: string; confidence: number }> {
  const riskTypesContent = extractTag(text, 'risk_types');
  if (!riskTypesContent) return [];

  const types: Array<{ type: string; confidence: number }> = [];

  // Match individual <type> tags (self-closing)
  const typePattern = /<type\s+name=["']([^"']+)["']\s+confidence=["']([^"']+)["']\s*\/>/gi;
  let match;

  while ((match = typePattern.exec(riskTypesContent)) !== null) {
    const typeName = match[1].trim();
    const confidenceStr = match[2].trim();
    const confidence = parseFloat(confidenceStr);

    if (typeName && !isNaN(confidence)) {
      types.push({
        type: typeName,
        confidence: Math.max(0, Math.min(1, confidence)), // Clamp to [0, 1]
      });
    }
  }

  return types;
}

/**
 * Safe float parsing with fallback
 */
export function parseFloatSafe(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = parseFloat(value.trim());
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safe integer parsing with fallback
 */
export function parseIntSafe(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = parseInt(value.trim(), 10);
  return isNaN(parsed) ? fallback : parsed;
}
