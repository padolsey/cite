import { describe, test, expect } from 'vitest';
import { resolveCountryCodes } from '../../lib/resources/LanguageToCountry.js';

describe('Language to Country Resolution', () => {
  test('explicit country takes priority', () => {
    const result = resolveCountryCodes('FR', 'en-US', 'en');
    expect(result).toEqual(['FR']);
  });

  test('locale parsing extracts country when no explicit country provided', () => {
    const result = resolveCountryCodes(undefined, 'es-MX', undefined);
    expect(result).toEqual(['MX', 'ES', 'CO', 'AR', 'US']);
  });

  test('locale parsing works with locale but prioritizes that country', () => {
    const result = resolveCountryCodes(undefined, 'en-GB', 'en');
    expect(result).toEqual(['GB', 'US', 'IN', 'CA', 'AU']);
  });

  test('language maps to countries by population', () => {
    const result = resolveCountryCodes(undefined, undefined, 'en');
    expect(result).toEqual(['US', 'IN', 'GB', 'CA', 'AU']);
  });

  test('Spanish maps to Mexico, Spain, Colombia, Argentina, US', () => {
    const result = resolveCountryCodes(undefined, undefined, 'es');
    expect(result).toEqual(['MX', 'ES', 'CO', 'AR', 'US']);
  });

  test('Portuguese maps to Brazil, Portugal, etc.', () => {
    const result = resolveCountryCodes(undefined, undefined, 'pt');
    expect(result).toEqual(['BR', 'PT', 'AO', 'MZ']);
  });

  test('French maps to France, DRC, Canada, etc.', () => {
    const result = resolveCountryCodes(undefined, undefined, 'fr');
    expect(result).toEqual(['FR', 'CD', 'CA', 'BE', 'CH']);
  });

  test('German maps to Germany, Austria, Switzerland', () => {
    const result = resolveCountryCodes(undefined, undefined, 'de');
    expect(result).toEqual(['DE', 'AT', 'CH']);
  });

  test('Hindi maps to India', () => {
    const result = resolveCountryCodes(undefined, undefined, 'hi');
    expect(result).toEqual(['IN']);
  });

  test('Chinese maps to China, Taiwan, Singapore', () => {
    const result = resolveCountryCodes(undefined, undefined, 'zh');
    expect(result).toEqual(['CN', 'TW', 'SG']);
  });

  test('Japanese maps to Japan', () => {
    const result = resolveCountryCodes(undefined, undefined, 'ja');
    expect(result).toEqual(['JP']);
  });

  test('unknown language returns empty array (triggers global resources)', () => {
    const result = resolveCountryCodes(undefined, undefined, 'xyz');
    expect(result).toEqual([]);
  });

  test('no country, locale, or language returns empty array', () => {
    const result = resolveCountryCodes(undefined, undefined, undefined);
    expect(result).toEqual([]);
  });

  test('case insensitive language codes', () => {
    const result = resolveCountryCodes(undefined, undefined, 'EN');
    expect(result).toEqual(['US', 'IN', 'GB', 'CA', 'AU']);
  });

  test('locale with language variant (en-US) prioritizes US', () => {
    const result = resolveCountryCodes(undefined, 'en-US', undefined);
    expect(result).toEqual(['US', 'IN', 'GB', 'CA', 'AU']);
  });

  test('locale with region variant (pt-BR) prioritizes Brazil', () => {
    const result = resolveCountryCodes(undefined, 'pt-BR', undefined);
    expect(result).toEqual(['BR', 'PT', 'AO', 'MZ']);
  });
});
