/**
 * Language to Country Mapping
 *
 * Maps ISO 639-1 language codes to country codes
 * based on speaker population
 *
 * Used when:
 * - LLM detects language but user didn't provide country
 * - Helps resolve appropriate crisis resources
 */

/**
 * Map language codes to country codes (ISO 3166-1 alpha-2)
 * Ordered by speaker population (largest first)
 *
 * Sources:
 * - Ethnologue (global language statistics)
 * - Wikipedia language demographics
 */
const LANGUAGE_TO_COUNTRIES: Record<string, string[]> = {
  // English (1.5B speakers)
  en: ['US', 'IN', 'GB', 'CA', 'AU'],

  // Spanish (500M+ speakers)
  es: ['MX', 'ES', 'CO', 'AR', 'US'],

  // Portuguese (260M+ speakers)
  pt: ['BR', 'PT', 'AO', 'MZ'],

  // French (280M+ speakers)
  fr: ['FR', 'CD', 'CA', 'BE', 'CH'],

  // German (130M+ speakers)
  de: ['DE', 'AT', 'CH'],

  // Hindi (600M+ speakers)
  hi: ['IN'],

  // Mandarin Chinese (1.1B+ speakers)
  zh: ['CN', 'TW', 'SG'],

  // Japanese (125M+ speakers)
  ja: ['JP'],

  // Korean (80M+ speakers)
  ko: ['KR'],

  // Arabic (420M+ speakers)
  ar: ['EG', 'SA', 'DZ', 'MA', 'IQ'],

  // Russian (260M+ speakers)
  ru: ['RU', 'BY', 'KZ'],

  // Italian (85M+ speakers)
  it: ['IT'],

  // Dutch (24M+ speakers)
  nl: ['NL', 'BE'],

  // Polish (45M+ speakers)
  pl: ['PL'],

  // Turkish (85M+ speakers)
  tr: ['TR'],

  // Vietnamese (85M+ speakers)
  vi: ['VN'],

  // Thai (60M+ speakers)
  th: ['TH'],

  // Swedish (13M+ speakers)
  sv: ['SE'],

  // Norwegian (5M+ speakers)
  no: ['NO'],

  // Danish (6M+ speakers)
  da: ['DK'],

  // Finnish (5M+ speakers)
  fi: ['FI'],

  // Greek (13M+ speakers)
  el: ['GR'],

  // Hebrew (9M+ speakers)
  he: ['IL'],

  // Indonesian (200M+ speakers)
  id: ['ID'],

  // Malay (80M+ speakers)
  ms: ['MY', 'SG', 'BN'],

  // Tagalog/Filipino (80M+ speakers)
  tl: ['PH'],
  fil: ['PH'],
};

/**
 * Resolve country codes from language and/or locale
 *
 * Priority:
 * 1. Explicit country code (if provided)
 * 2. Locale parsing (e.g., 'en-GB' -> ['GB'])
 * 3. Language mapping (e.g., 'en' -> ['US', 'IN', 'GB', 'CA', 'AU'])
 * 4. Empty array (triggers global resources)
 *
 * @param userCountry - Explicit country code from user
 * @param locale - Locale string from LLM (e.g., 'en-US', 'es-MX')
 * @param language - Language code from LLM (e.g., 'en', 'es')
 * @returns Array of country codes in priority order
 */
export function resolveCountryCodes(
  userCountry: string | undefined,
  locale: string | undefined,
  language: string | undefined
): string[] {
  // 1. Explicit country takes priority
  if (userCountry) {
    return [userCountry.toUpperCase()];
  }

  // 2. Try to parse country from locale (e.g., 'en-GB' -> 'GB')
  if (locale && locale.includes('-')) {
    const parts = locale.split('-');
    if (parts.length === 2) {
      const countryCode = parts[1].toUpperCase();
      // If we have a mapping for this language, verify the country is in it
      const languageCode = parts[0].toLowerCase();
      const validCountries = LANGUAGE_TO_COUNTRIES[languageCode];
      if (validCountries && validCountries.includes(countryCode)) {
        // Return this country plus others for the language
        return [countryCode, ...validCountries.filter((c) => c !== countryCode)];
      }
      // Otherwise just return the country from locale
      return [countryCode];
    }
  }

  // 3. Map language to countries by population
  if (language) {
    const languageCode = language.toLowerCase();
    const countries = LANGUAGE_TO_COUNTRIES[languageCode];
    if (countries) {
      return countries;
    }
  }

  // 4. No country/language info - return empty (will trigger global resources)
  return [];
}
