import { BaseJudge } from './BaseJudge.js';
import { PROMPTS } from '../../prompts/templates.js';
import type { RiskTypeResult, RiskType } from '../types/index.js';
import { extractRiskTypes } from '../../utils/xml-parser.js';

/**
 * Risk Types Judge
 *
 * Identifies specific risk indicators (self-harm, psychosis, mania, etc.)
 * using the structured RISK_TYPES_IDENTIFICATION prompt.
 */
export class RiskTypesJudge extends BaseJudge<RiskTypeResult[]> {
  protected getSystemPrompt(): string {
    return PROMPTS.RISK_TYPES_IDENTIFICATION;
  }

  protected parseResponse(response: string): RiskTypeResult[] {
    // Log raw response for debugging when enabled
    if (process.env.DEBUG_CLASSIFICATION === 'true') {
      console.log('\n' + '='.repeat(80));
      console.log('📥 RAW LLM RESPONSE (RISK TYPES):');
      console.log('='.repeat(80));
      console.log(response);
      console.log('='.repeat(80) + '\n');
    }

    // Use centralized robust parser
    const extracted = extractRiskTypes(response);

    // Convert to RiskTypeResult[] format (already matches)
    return extracted.map((item) => ({
      type: item.type as RiskType,
      confidence: item.confidence,
    }));
  }
}


