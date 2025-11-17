import { BaseJudge } from './BaseJudge.js';
import { PROMPTS } from '../../prompts/templates.js';
import type { RiskLevelResult, ClassificationName, RiskType, RiskTypeResult } from '../types/index.js';
import { CLASSIFICATION_SCALES } from '../types/index.js';
import {
  extractTag,
  extractLanguage,
  extractLocale,
  extractClassification,
  extractRiskTypes,
} from '../../utils/xml-parser.js';

/**
 * Risk Level Judge
 *
 * Classifies overall risk level using classification scales
 * (not numeric scores) to avoid LLM bias
 *
 * Returns: RiskLevelResult with level, confidence, and explanation
 */
export class RiskLevelJudge extends BaseJudge<RiskLevelResult> {
  protected getSystemPrompt(): string {
    return PROMPTS.RISK_LEVEL_CLASSIFICATION;
  }

  protected parseResponse(response: string): RiskLevelResult {
    // Log raw response for debugging
    if (process.env.DEBUG_CLASSIFICATION === 'true') {
      console.log('\n' + '='.repeat(80));
      console.log('📥 RAW LLM RESPONSE:');
      console.log('='.repeat(80));
      console.log(response);
      console.log('='.repeat(80) + '\n');
    }

    // Extract language (with normalization and validation)
    const language = extractLanguage(response);

    // Extract locale (with normalization and validation)
    const locale = extractLocale(response);

    // Extract reflection
    const reflection = extractTag(response, 'reflection') || 'No reflection provided';

    // Extract structured risk types from the same response
    const extractedTypes = extractRiskTypes(response);
    const risk_types: RiskTypeResult[] =
      extractedTypes.map(item => ({
        type: item.type as RiskType,
        confidence: item.confidence,
      })) ?? [];

    // Extract classification (normalized to uppercase)
    const className = extractClassification(response) as ClassificationName | undefined;

    // Map classification to level and confidence
    if (className && className in CLASSIFICATION_SCALES) {
      const { level, confidence } = CLASSIFICATION_SCALES[className];

      // Log parsed result
      if (process.env.DEBUG_CLASSIFICATION === 'true') {
        console.log('✅ PARSED CLASSIFICATION:');
        console.log(`  Language: ${language || 'not detected'}`);
        console.log(`  Locale: ${locale || 'not specified'}`);
        console.log(`  Classification: ${className}`);
        console.log(`  Risk Level: ${level}`);
        console.log(`  Confidence: ${confidence}`);
        console.log(`  Reflection: ${reflection.substring(0, 100)}...`);
        console.log('');
      }

      return {
        level,
        confidence,
        reflection,
        language,
        locale,
        risk_types,
      };
    }

    // Fallback if classification not recognized
    // Default to medium risk with low confidence
    console.warn(`⚠️  Unrecognized classification: ${className}. Defaulting to medium risk.`);
    return {
      level: 'medium',
      confidence: 0.5, // Low confidence for unknown
      reflection: reflection || 'Could not parse classification',
      language,
      locale,
      risk_types,
    };
  }
}
