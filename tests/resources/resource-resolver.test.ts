/**
 * Resource Resolver Tests
 *
 * Unit tests for crisis resource resolution
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { ResourceResolver } from '../../lib/resources/ResourceResolver.js';

describe('ResourceResolver', () => {
  let resolver: ResourceResolver;

  beforeEach(() => {
    resolver = new ResourceResolver();
  });

  /**
   * Test: Resolve resources for supported country
   */
  test('resolves resources for US', () => {
    const resources = resolver.resolve('US');

    expect(resources.length).toBeGreaterThan(0);
    expect(resources.some(r => r.name.includes('988'))).toBe(true);
    expect(resources.some(r => r.type === 'emergency_number')).toBe(true);
  });

  /**
   * Test: Resolve resources for UK
   */
  test('resolves resources for GB', () => {
    const resources = resolver.resolve('GB');

    expect(resources.length).toBeGreaterThan(0);
    expect(resources.some(r => r.name.includes('Samaritans'))).toBe(true);
  });

  /**
   * Test: Case insensitive country codes
   */
  test('handles lowercase country codes', () => {
    const resources = resolver.resolve('us');

    expect(resources.length).toBeGreaterThan(0);
    expect(resources.some(r => r.name.includes('988'))).toBe(true);
  });

  /**
   * Test: Unknown country returns defaults
   */
  test('returns default resources for unknown country', () => {
    const resources = resolver.resolve('XX');

    expect(resources.length).toBeGreaterThan(0);
    expect(resources.every(r => r.type === 'support_service')).toBe(true);
  });

  /**
   * Test: Unknown country with includeDefaults=false
   */
  test('returns empty array for unknown country when includeDefaults=false', () => {
    const resources = resolver.resolve('XX', { includeDefaults: false });

    expect(resources.length).toBe(0);
  });

  /**
   * Test: Filter by type
   */
  test('filters resources by type', () => {
    const resources = resolver.resolve('US', {
      filterByType: ['crisis_line'],
    });

    expect(resources.length).toBeGreaterThan(0);
    expect(resources.every(r => r.type === 'crisis_line')).toBe(true);
  });

  /**
   * Test: Filter by multiple types
   */
  test('filters resources by multiple types', () => {
    const resources = resolver.resolve('US', {
      filterByType: ['crisis_line', 'text_line'],
    });

    expect(resources.length).toBeGreaterThan(0);
    expect(resources.every(r => r.type === 'crisis_line' || r.type === 'text_line')).toBe(true);
    expect(resources.some(r => r.type === 'emergency_number')).toBe(false);
  });

  /**
   * Test: Filter by language
   */
  test('filters resources by language', () => {
    const resources = resolver.resolve('CA', {
      filterByLanguage: ['fr'],
    });

    expect(resources.length).toBeGreaterThan(0);
    expect(resources.every(r => r.languages?.includes('fr'))).toBe(true);
  });

  /**
   * Test: resolveUrgent helper
   */
  test('resolveUrgent returns only urgent resources', () => {
    const resources = resolver.resolveUrgent('US');

    expect(resources.length).toBeGreaterThan(0);
    expect(
      resources.every(
        r => r.type === 'emergency_number' || r.type === 'crisis_line' || r.type === 'text_line'
      )
    ).toBe(true);
    expect(resources.some(r => r.type === 'support_service')).toBe(false);
  });

  /**
   * Test: hasResources method
   */
  test('hasResources returns true for supported country', () => {
    expect(resolver.hasResources('US')).toBe(true);
    expect(resolver.hasResources('GB')).toBe(true);
    expect(resolver.hasResources('XX')).toBe(false);
  });

  /**
   * Test: getSupportedCountries
   */
  test('getSupportedCountries returns array of country codes', () => {
    const countries = resolver.getSupportedCountries();

    expect(countries).toContain('US');
    expect(countries).toContain('GB');
    expect(countries).toContain('CA');
    expect(countries).toContain('AU');
    expect(countries.length).toBeGreaterThan(5);
  });

  /**
   * Test: All resources have required fields
   */
  test('all resolved resources have required fields', () => {
    const resources = resolver.resolve('US');

    resources.forEach(resource => {
      expect(resource.type).toBeDefined();
      expect(resource.name).toBeDefined();
      expect(typeof resource.name).toBe('string');
      expect(resource.name.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test: Emergency numbers are always included
   */
  test('supported countries include emergency numbers', () => {
    const countries = ['US', 'GB', 'CA', 'AU'];

    countries.forEach(country => {
      const resources = resolver.resolve(country);
      const hasEmergency = resources.some(r => r.type === 'emergency_number');
      expect(hasEmergency).toBe(true);
    });
  });

  /**
   * Test: Resources include contact information
   */
  test('crisis resources include phone or text or URL', () => {
    const resources = resolver.resolve('US');

    resources.forEach(resource => {
      const hasContact =
        resource.phone !== undefined ||
        resource.text_instructions !== undefined ||
        resource.chat_url !== undefined;
      expect(hasContact).toBe(true);
    });
  });
});
