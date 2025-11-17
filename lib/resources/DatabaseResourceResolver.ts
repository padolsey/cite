/**
 * Database-backed Crisis Resource Resolver
 *
 * Queries Supabase for crisis resources instead of hardcoded registry
 * Features:
 * - In-memory caching with TTL (5 minutes default)
 * - Fallback to hardcoded registry if database unavailable
 * - Same interface as ResourceResolver for easy migration
 */

import type { CrisisResource } from '../evaluation/types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ResourceResolver } from './ResourceResolver.js';
import type { IResourceResolver, ResourceResolverOptions } from './IResourceResolver.js';

interface CachedResources {
  resources: CrisisResource[];
  timestamp: number;
}

interface DatabaseRow {
  id: string;
  country_code: string;
  name: string;
  type: string;
  phone: string | null;
  text_instructions: string | null;
  chat_url: string | null;
  availability: string | null;
  languages: string[];
  description: string | null;
  display_order: number;
}

/**
 * Database-backed resource resolver with caching
 */
export class DatabaseResourceResolver implements IResourceResolver {
  private cache: Map<string, CachedResources> = new Map();
  private cacheTTL: number; // milliseconds
  private fallbackResolver: ResourceResolver;
  private supabase: SupabaseClient | null;

  constructor(
    supabase: SupabaseClient | null = null,
    cacheTTL: number = 5 * 60 * 1000 // 5 minutes default
  ) {
    this.supabase = supabase;
    this.cacheTTL = cacheTTL;
    this.fallbackResolver = new ResourceResolver();
  }

  /**
   * Get crisis resources for country code(s)
   *
   * Same interface as ResourceResolver for easy migration
   */
  async resolve(
    countryCodes: string | string[],
    options: ResourceResolverOptions = {}
  ): Promise<CrisisResource[]> {
    // If no Supabase client, fall back to hardcoded registry
    if (!this.supabase) {
      return this.fallbackResolver.resolve(countryCodes, options);
    }

    const codes = Array.isArray(countryCodes) ? countryCodes : [countryCodes];
    const { includeDefaults = true, filterByType, filterByLanguage } = options;

    try {
      let resources: CrisisResource[] = [];

      // Try to get resources from database
      for (const code of codes) {
        const normalizedCode = code.toUpperCase();
        const cachedOrFetched = await this.getResourcesForCountry(normalizedCode);
        resources.push(...cachedOrFetched);
      }

      // If no supported countries found, use global resources
      if (resources.length === 0 && includeDefaults) {
        const globalResources = await this.getResourcesForCountry('GLOBAL');
        resources = globalResources;
      }

      // Apply filters
      if (filterByType && filterByType.length > 0) {
        resources = resources.filter((r) => filterByType.includes(r.type));
      }

      if (filterByLanguage && filterByLanguage.length > 0) {
        resources = resources.filter((r) =>
          r.languages?.some((lang) => filterByLanguage.includes(lang))
        );
      }

      // Deduplicate by name (in case multiple countries have same resource)
      const seen = new Set<string>();
      return resources.filter((r) => {
        if (seen.has(r.name)) return false;
        seen.add(r.name);
        return true;
      });
    } catch (error) {
      // Log error but fall back to hardcoded registry
      console.warn('Database query failed, falling back to hardcoded registry:', error);
      return this.fallbackResolver.resolve(countryCodes, options);
    }
  }

  /**
   * Get resources for a single country (with caching)
   */
  private async getResourcesForCountry(countryCode: string): Promise<CrisisResource[]> {
    const cacheKey = `country:${countryCode}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.resources;
    }

    // Fetch from database
    if (!this.supabase) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('crisis_resources')
      .select('*')
      .eq('country_code', countryCode)
      .eq('enabled', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error(`Error fetching resources for ${countryCode}:`, error);
      return [];
    }

    // Convert database rows to CrisisResource format
    const resources = (data || []).map((row: DatabaseRow) => this.convertToResource(row));

    // Cache the result
    this.cache.set(cacheKey, {
      resources,
      timestamp: Date.now(),
    });

    return resources;
  }

  /**
   * Convert database row to CrisisResource
   */
  private convertToResource(row: DatabaseRow): CrisisResource {
    return {
      type: row.type as CrisisResource['type'],
      name: row.name,
      phone: row.phone || undefined,
      text_instructions: row.text_instructions || undefined,
      chat_url: row.chat_url || undefined,
      availability: row.availability || undefined,
      languages: row.languages || undefined,
      description: row.description || undefined,
    };
  }

  /**
   * Get only emergency/crisis line resources (phone/text)
   */
  async resolveUrgent(countryCode: string): Promise<CrisisResource[]> {
    return this.resolve(countryCode, {
      filterByType: ['emergency_number', 'crisis_line', 'text_line'],
    });
  }

  /**
   * Check if a country has crisis resources
   */
  async hasResources(countryCode: string): Promise<boolean> {
    if (!this.supabase) {
      return this.fallbackResolver.hasResources(countryCode);
    }

    try {
      const { count, error } = await this.supabase
        .from('crisis_resources')
        .select('*', { count: 'exact', head: true })
        .eq('country_code', countryCode.toUpperCase())
        .eq('enabled', true);

      if (error) {
        console.error('Error checking resources:', error);
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      console.warn('Database query failed:', error);
      return this.fallbackResolver.hasResources(countryCode);
    }
  }

  /**
   * Get all supported country codes
   */
  async getSupportedCountries(): Promise<string[]> {
    if (!this.supabase) {
      return this.fallbackResolver.getSupportedCountries();
    }

    try {
      const { data, error } = await this.supabase
        .from('crisis_resources')
        .select('country_code')
        .eq('enabled', true);

      if (error) {
        console.error('Error fetching supported countries:', error);
        return this.fallbackResolver.getSupportedCountries();
      }

      // Get unique country codes
      const codes = new Set<string>();
      (data || []).forEach((row: { country_code: string }) => {
        if (row.country_code !== 'GLOBAL') {
          codes.add(row.country_code);
        }
      });

      return Array.from(codes).sort();
    } catch (error) {
      console.warn('Database query failed:', error);
      return this.fallbackResolver.getSupportedCountries();
    }
  }

  /**
   * Clear the cache (useful for testing or after database updates)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific country
   */
  clearCountryCache(countryCode: string): void {
    this.cache.delete(`country:${countryCode.toUpperCase()}`);
  }
}

/**
 * Helper to create a DatabaseResourceResolver with Supabase client
 */
export function createDatabaseResourceResolver(
  supabase: SupabaseClient | null,
  cacheTTL?: number
): DatabaseResourceResolver {
  return new DatabaseResourceResolver(supabase, cacheTTL);
}
