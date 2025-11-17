/**
 * Crisis Resource Resolver
 *
 * Resolves crisis resources based on user's country
 * Extensible - add new countries to registry.ts
 */

import type { CrisisResource } from '../evaluation/types.js';
import {
  CRISIS_RESOURCES_BY_COUNTRY,
  DEFAULT_CRISIS_RESOURCES,
  isCountrySupported,
} from './registry.js';
import type { IResourceResolver, ResourceResolverOptions } from './IResourceResolver.js';

// Re-export for convenience
export type { ResourceResolverOptions };

/**
 * Resolves crisis resources for a given country (hardcoded registry)
 */
export class ResourceResolver implements IResourceResolver {
  /**
   * Get crisis resources for country code(s)
   *
   * @param countryCodes - Single country code or array of codes in priority order
   * @param options - Optional filtering and behavior options
   * @returns Crisis resources (defaults if no countries supported)
   */
  resolve(
    countryCodes: string | string[],
    options: ResourceResolverOptions = {}
  ): CrisisResource[] {
    const { includeDefaults = true, filterByType, filterByLanguage } = options;

    // Normalize to array
    const codes = Array.isArray(countryCodes) ? countryCodes : [countryCodes];

    // Get resources for each country in priority order
    let resources: CrisisResource[] = [];

    for (const code of codes) {
      const normalizedCode = code.toUpperCase();

      if (isCountrySupported(normalizedCode)) {
        resources.push(...CRISIS_RESOURCES_BY_COUNTRY[normalizedCode]);
      }
    }

    // If no supported countries found, use defaults
    if (resources.length === 0 && includeDefaults) {
      resources = [...DEFAULT_CRISIS_RESOURCES];
    }

    // Apply filters
    if (filterByType && filterByType.length > 0) {
      resources = resources.filter(r => filterByType.includes(r.type));
    }

    if (filterByLanguage && filterByLanguage.length > 0) {
      resources = resources.filter(
        r => r.languages?.some(lang => filterByLanguage.includes(lang))
      );
    }

    // Deduplicate by name (in case multiple countries have same resource)
    const seen = new Set<string>();
    return resources.filter(r => {
      if (seen.has(r.name)) return false;
      seen.add(r.name);
      return true;
    });
  }

  /**
   * Get only emergency/crisis line resources (phone/text)
   * Useful for urgent situations
   */
  resolveUrgent(countryCode: string): CrisisResource[] {
    return this.resolve(countryCode, {
      filterByType: ['emergency_number', 'crisis_line', 'text_line'],
    });
  }

  /**
   * Check if a country has crisis resources
   */
  hasResources(countryCode: string): boolean {
    return isCountrySupported(countryCode.toUpperCase());
  }

  /**
   * Get all supported country codes
   */
  getSupportedCountries(): string[] {
    return Object.keys(CRISIS_RESOURCES_BY_COUNTRY);
  }
}

/**
 * Default singleton instance
 */
export const defaultResourceResolver = new ResourceResolver();

/**
 * Convenience function for simple resource resolution
 */
export function resolveResources(
  countryCode: string,
  options?: ResourceResolverOptions
): CrisisResource[] {
  return defaultResourceResolver.resolve(countryCode, options);
}
