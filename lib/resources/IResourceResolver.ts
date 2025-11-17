/**
 * Resource Resolver Interface
 *
 * Common interface for both sync (hardcoded) and async (database) resource resolvers
 */

import type { CrisisResource } from '../evaluation/types.js';

export interface ResourceResolverOptions {
  /**
   * Whether to include default/fallback resources
   * when country is not found
   * Default: true
   */
  includeDefaults?: boolean;

  /**
   * Filter resources by type
   */
  filterByType?: CrisisResource['type'][];

  /**
   * Filter resources by language
   */
  filterByLanguage?: string[];
}

/**
 * Interface for resource resolvers (sync or async)
 */
export interface IResourceResolver {
  /**
   * Get crisis resources for country code(s)
   *
   * @param countryCodes - Single country code or array of codes in priority order
   * @param options - Optional filtering and behavior options
   * @returns Crisis resources (defaults if no countries supported)
   */
  resolve(
    countryCodes: string | string[],
    options?: ResourceResolverOptions
  ): CrisisResource[] | Promise<CrisisResource[]>;

  /**
   * Get only emergency/crisis line resources (phone/text)
   */
  resolveUrgent?(countryCode: string): CrisisResource[] | Promise<CrisisResource[]>;

  /**
   * Check if a country has crisis resources
   */
  hasResources?(countryCode: string): boolean | Promise<boolean>;

  /**
   * Get all supported country codes
   */
  getSupportedCountries?(): string[] | Promise<string[]>;
}
