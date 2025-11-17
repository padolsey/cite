import { describe, test, expect } from 'vitest';
import {
  extractTag,
  extractTags,
  extractLanguage,
  extractLocale,
  extractClassification,
  extractRiskTypes,
  normalizeLanguageCode,
  normalizeLocale,
  normalizeCountryCode,
  parseFloatSafe,
  parseIntSafe,
} from '../../lib/utils/xml-parser.js';

describe('XML Tag Extraction', () => {
  describe('extractTag', () => {
    test('extracts basic tag', () => {
      const text = '<language>en</language>';
      expect(extractTag(text, 'language')).toBe('en');
    });

    test('is case-insensitive for tag names', () => {
      expect(extractTag('<Language>en</Language>', 'language')).toBe('en');
      expect(extractTag('<LANGUAGE>en</LANGUAGE>', 'language')).toBe('en');
      expect(extractTag('<LaNgUaGe>en</LaNgUaGe>', 'language')).toBe('en');
    });

    test('handles extra whitespace in tags', () => {
      expect(extractTag('< language >en</ language >', 'language')).toBe('en');
      expect(extractTag('<language  >en</language  >', 'language')).toBe('en');
    });

    test('trims extracted values', () => {
      expect(extractTag('<language>  en  </language>', 'language')).toBe('en');
      expect(extractTag('<language>\n\ten\n\t</language>', 'language')).toBe('en');
    });

    test('handles multiline content', () => {
      const text = `<reflection>
        This is a
        multiline reflection
      </reflection>`;
      const result = extractTag(text, 'reflection');
      expect(result).toContain('multiline reflection');
    });

    test('returns undefined if tag not found', () => {
      expect(extractTag('<other>value</other>', 'language')).toBeUndefined();
      expect(extractTag('no tags here', 'language')).toBeUndefined();
    });

    test('returns undefined for empty tags', () => {
      expect(extractTag('<language></language>', 'language')).toBeUndefined();
      expect(extractTag('<language>   </language>', 'language')).toBeUndefined();
    });
  });

  describe('extractTags', () => {
    test('extracts multiple tags', () => {
      const text = '<language>en</language><locale>en-US</locale><classification>CLASS_NONE</classification>';
      const result = extractTags(text, ['language', 'locale', 'classification']);

      expect(result.language).toBe('en');
      expect(result.locale).toBe('en-US');
      expect(result.classification).toBe('CLASS_NONE');
    });

    test('returns undefined for missing tags', () => {
      const text = '<language>en</language>';
      const result = extractTags(text, ['language', 'locale', 'other']);

      expect(result.language).toBe('en');
      expect(result.locale).toBeUndefined();
      expect(result.other).toBeUndefined();
    });
  });
});

describe('Language Code Normalization', () => {
  describe('normalizeLanguageCode', () => {
    test('normalizes valid 2-letter codes', () => {
      expect(normalizeLanguageCode('en')).toBe('en');
      expect(normalizeLanguageCode('EN')).toBe('en');
      expect(normalizeLanguageCode('Es')).toBe('es');
      expect(normalizeLanguageCode('FR')).toBe('fr');
    });

    test('converts full language names to codes', () => {
      expect(normalizeLanguageCode('english')).toBe('en');
      expect(normalizeLanguageCode('English')).toBe('en');
      expect(normalizeLanguageCode('SPANISH')).toBe('es');
      expect(normalizeLanguageCode('French')).toBe('fr');
      expect(normalizeLanguageCode('german')).toBe('de');
      expect(normalizeLanguageCode('Portuguese')).toBe('pt');
      expect(normalizeLanguageCode('japanese')).toBe('ja');
      expect(normalizeLanguageCode('chinese')).toBe('zh');
    });

    test('trims whitespace', () => {
      expect(normalizeLanguageCode('  en  ')).toBe('en');
      expect(normalizeLanguageCode('\ten\n')).toBe('en');
    });

    test('returns undefined for invalid codes', () => {
      expect(normalizeLanguageCode('xyz')).toBeUndefined();
      expect(normalizeLanguageCode('e')).toBeUndefined();
      expect(normalizeLanguageCode('eng')).toBeUndefined();
      expect(normalizeLanguageCode('en-US')).toBeUndefined(); // This is a locale, not a language code
      expect(normalizeLanguageCode('')).toBeUndefined();
      expect(normalizeLanguageCode(undefined)).toBeUndefined();
    });
  });

  describe('normalizeLocale', () => {
    test('normalizes valid locales with hyphens', () => {
      expect(normalizeLocale('en-US')).toBe('en-US');
      expect(normalizeLocale('en-us')).toBe('en-US');
      expect(normalizeLocale('EN-US')).toBe('en-US');
      expect(normalizeLocale('es-MX')).toBe('es-MX');
      expect(normalizeLocale('pt-BR')).toBe('pt-BR');
    });

    test('handles locales without hyphens', () => {
      expect(normalizeLocale('enus')).toBe('en-US');
      expect(normalizeLocale('enUS')).toBe('en-US');
      expect(normalizeLocale('ENUS')).toBe('en-US');
      expect(normalizeLocale('esmx')).toBe('es-MX');
    });

    test('handles locales with underscores', () => {
      expect(normalizeLocale('en_US')).toBe('en-US');
      expect(normalizeLocale('es_MX')).toBe('es-MX');
      expect(normalizeLocale('pt_BR')).toBe('pt-BR');
    });

    test('trims whitespace', () => {
      expect(normalizeLocale('  en-US  ')).toBe('en-US');
      expect(normalizeLocale('\ten-US\n')).toBe('en-US');
    });

    test('returns undefined for invalid locales', () => {
      expect(normalizeLocale('en')).toBeUndefined(); // Just language
      expect(normalizeLocale('en-')).toBeUndefined(); // Missing country
      expect(normalizeLocale('-US')).toBeUndefined(); // Missing language
      expect(normalizeLocale('en-USA')).toBeUndefined(); // 3-letter country code
      expect(normalizeLocale('eng-US')).toBeUndefined(); // 3-letter language code
      expect(normalizeLocale('')).toBeUndefined();
      expect(normalizeLocale(undefined)).toBeUndefined();
    });
  });

  describe('normalizeCountryCode', () => {
    test('normalizes valid 2-letter country codes', () => {
      expect(normalizeCountryCode('us')).toBe('US');
      expect(normalizeCountryCode('US')).toBe('US');
      expect(normalizeCountryCode('gb')).toBe('GB');
      expect(normalizeCountryCode('GB')).toBe('GB');
      expect(normalizeCountryCode('fr')).toBe('FR');
    });

    test('trims whitespace', () => {
      expect(normalizeCountryCode('  US  ')).toBe('US');
      expect(normalizeCountryCode('\tGB\n')).toBe('GB');
    });

    test('returns undefined for invalid codes', () => {
      expect(normalizeCountryCode('USA')).toBeUndefined(); // 3 letters
      expect(normalizeCountryCode('U')).toBeUndefined(); // 1 letter
      expect(normalizeCountryCode('1A')).toBeUndefined(); // Contains number
      expect(normalizeCountryCode('')).toBeUndefined();
      expect(normalizeCountryCode(undefined)).toBeUndefined();
    });
  });
});

describe('High-Level Extractors', () => {
  describe('extractLanguage', () => {
    test('extracts and normalizes language', () => {
      expect(extractLanguage('<language>en</language>')).toBe('en');
      expect(extractLanguage('<language>EN</language>')).toBe('en');
      expect(extractLanguage('<LANGUAGE>es</LANGUAGE>')).toBe('es');
      expect(extractLanguage('<language>english</language>')).toBe('en');
    });

    test('returns undefined for invalid or missing language', () => {
      expect(extractLanguage('<language>xyz</language>')).toBeUndefined();
      expect(extractLanguage('<other>en</other>')).toBeUndefined();
      expect(extractLanguage('no tags')).toBeUndefined();
    });
  });

  describe('extractLocale', () => {
    test('extracts and normalizes locale', () => {
      expect(extractLocale('<locale>en-US</locale>')).toBe('en-US');
      expect(extractLocale('<locale>en-us</locale>')).toBe('en-US');
      expect(extractLocale('<LOCALE>enus</LOCALE>')).toBe('en-US');
      expect(extractLocale('<locale>en_US</locale>')).toBe('en-US');
    });

    test('returns undefined for invalid or missing locale', () => {
      expect(extractLocale('<locale>invalid</locale>')).toBeUndefined();
      expect(extractLocale('<other>en-US</other>')).toBeUndefined();
      expect(extractLocale('no tags')).toBeUndefined();
    });
  });

  describe('extractClassification', () => {
    test('extracts and normalizes classification', () => {
      expect(extractClassification('<classification>CLASS_NONE</classification>')).toBe('CLASS_NONE');
      expect(extractClassification('<classification>class_none</classification>')).toBe('CLASS_NONE');
      expect(extractClassification('<classification>Class_None</classification>')).toBe('CLASS_NONE');
      expect(extractClassification('<CLASSIFICATION>class_medium</CLASSIFICATION>')).toBe('CLASS_MEDIUM');
    });

    test('normalizes spaces to underscores', () => {
      expect(extractClassification('<classification>CLASS NONE</classification>')).toBe('CLASS_NONE');
      expect(extractClassification('<classification>class   medium</classification>')).toBe('CLASS_MEDIUM');
    });

    test('returns undefined for missing classification', () => {
      expect(extractClassification('<other>CLASS_NONE</other>')).toBeUndefined();
      expect(extractClassification('no tags')).toBeUndefined();
    });
  });
});

describe('Risk Types Extraction', () => {
  test('extracts multiple risk types', () => {
    const text = `
      <risk_types>
        <type name="self_harm_passive_ideation" confidence="0.9" />
        <type name="severe_depression_indicators" confidence="0.7" />
      </risk_types>
    `;

    const result = extractRiskTypes(text);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: 'self_harm_passive_ideation', confidence: 0.9 });
    expect(result[1]).toEqual({ type: 'severe_depression_indicators', confidence: 0.7 });
  });

  test('handles empty risk_types tag', () => {
    const text = '<risk_types></risk_types>';
    expect(extractRiskTypes(text)).toEqual([]);
  });

  test('handles missing risk_types tag', () => {
    const text = '<other>content</other>';
    expect(extractRiskTypes(text)).toEqual([]);
  });

  test('clamps confidence values to [0, 1]', () => {
    const text = `
      <risk_types>
        <type name="test1" confidence="1.5" />
        <type name="test2" confidence="-0.2" />
        <type name="test3" confidence="0.5" />
      </risk_types>
    `;

    const result = extractRiskTypes(text);

    expect(result[0].confidence).toBe(1.0);
    expect(result[1].confidence).toBe(0.0);
    expect(result[2].confidence).toBe(0.5);
  });

  test('handles single quotes in attributes', () => {
    const text = `<risk_types><type name='self_harm' confidence='0.8' /></risk_types>`;
    const result = extractRiskTypes(text);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'self_harm', confidence: 0.8 });
  });

  test('skips invalid entries', () => {
    const text = `
      <risk_types>
        <type name="valid" confidence="0.8" />
        <type name="" confidence="0.9" />
        <type name="also_valid" confidence="invalid" />
      </risk_types>
    `;

    const result = extractRiskTypes(text);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'valid', confidence: 0.8 });
  });
});

describe('Safe Parsing Utilities', () => {
  describe('parseFloatSafe', () => {
    test('parses valid floats', () => {
      expect(parseFloatSafe('0.5', 0)).toBe(0.5);
      expect(parseFloatSafe('1.0', 0)).toBe(1.0);
      expect(parseFloatSafe('0.999', 0)).toBe(0.999);
      expect(parseFloatSafe('3.14159', 0)).toBe(3.14159);
    });

    test('trims whitespace', () => {
      expect(parseFloatSafe('  0.5  ', 0)).toBe(0.5);
      expect(parseFloatSafe('\t1.0\n', 0)).toBe(1.0);
    });

    test('returns fallback for invalid values', () => {
      expect(parseFloatSafe('invalid', 0.75)).toBe(0.75);
      expect(parseFloatSafe('', 0.5)).toBe(0.5);
      expect(parseFloatSafe(undefined, 1.0)).toBe(1.0);
    });

    test('handles edge cases', () => {
      expect(parseFloatSafe('0', 1.0)).toBe(0);
      expect(parseFloatSafe('-0.5', 0)).toBe(-0.5);
      expect(parseFloatSafe('Infinity', 0)).toBe(Infinity);
    });
  });

  describe('parseIntSafe', () => {
    test('parses valid integers', () => {
      expect(parseIntSafe('5', 0)).toBe(5);
      expect(parseIntSafe('100', 0)).toBe(100);
      expect(parseIntSafe('-10', 0)).toBe(-10);
    });

    test('trims whitespace', () => {
      expect(parseIntSafe('  42  ', 0)).toBe(42);
      expect(parseIntSafe('\t100\n', 0)).toBe(100);
    });

    test('returns fallback for invalid values', () => {
      expect(parseIntSafe('invalid', 10)).toBe(10);
      expect(parseIntSafe('', 5)).toBe(5);
      expect(parseIntSafe(undefined, 99)).toBe(99);
    });

    test('truncates floats', () => {
      expect(parseIntSafe('3.14', 0)).toBe(3);
      expect(parseIntSafe('5.9', 0)).toBe(5);
    });
  });
});

describe('Real-World LLM Response Scenarios', () => {
  test('handles messy LLM response with all tags', () => {
    const messyResponse = `
      <Language>English</Language>
      < locale >en-us</ locale >

      <REFLECTION>
        User expresses passive suicidal ideation without specific plan.
      </REFLECTION>

      <classification>class_medium</classification>
    `;

    expect(extractLanguage(messyResponse)).toBe('en');
    expect(extractLocale(messyResponse)).toBe('en-US');
    expect(extractTag(messyResponse, 'reflection')).toContain('passive suicidal ideation');
    expect(extractClassification(messyResponse)).toBe('CLASS_MEDIUM');
  });

  test('handles missing optional tags gracefully', () => {
    const response = `
      <language>es</language>
      <reflection>General conversation.</reflection>
      <classification>CLASS_NONE</classification>
    `;

    expect(extractLanguage(response)).toBe('es');
    expect(extractLocale(response)).toBeUndefined(); // Optional tag missing
    expect(extractClassification(response)).toBe('CLASS_NONE');
  });

  test('handles malformed but recoverable tags', () => {
    const response = '<LANGUAGE>  EN  </LANGUAGE><locale>enus</locale>';

    expect(extractLanguage(response)).toBe('en');
    expect(extractLocale(response)).toBe('en-US');
  });

  test('handles completely invalid language but valid classification', () => {
    const response = `
      <language>klingon</language>
      <classification>CLASS_HIGH</classification>
    `;

    expect(extractLanguage(response)).toBeUndefined(); // Invalid language
    expect(extractClassification(response)).toBe('CLASS_HIGH'); // Valid classification
  });
});
