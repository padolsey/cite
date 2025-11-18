#!/usr/bin/env tsx
/**
 * Translation Build Script
 *
 * Translates safe response templates into top 10 languages for AI/mental health
 * Uses frontier model with caching to avoid redundant translations
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';
import { OpenRouterProvider } from '../lib/providers/OpenRouterProvider.js';
import { RESPONSE_TEMPLATES } from '../lib/responses/templates.js';

// Top 10 languages for AI mental health support
// Based on: global reach, mental health resource availability, internet usage
const TARGET_LANGUAGES = [
  { code: 'en', name: 'English', locale: 'en-US' },
  { code: 'zh', name: 'Chinese (Mandarin)', locale: 'zh-CN' },
  { code: 'es', name: 'Spanish', locale: 'es-ES' },
  { code: 'ar', name: 'Arabic', locale: 'ar-SA' },
  { code: 'id', name: 'Indonesian', locale: 'id-ID' },
  { code: 'pt', name: 'Portuguese', locale: 'pt-BR' },
  { code: 'fr', name: 'French', locale: 'fr-FR' },
  { code: 'ja', name: 'Japanese', locale: 'ja-JP' },
  { code: 'ru', name: 'Russian', locale: 'ru-RU' },
  { code: 'de', name: 'German', locale: 'de-DE' },
] as const;

// Best model for translation: Gemini 2.5 Pro (best multilingual quality on OpenRouter)
const TRANSLATION_MODEL = 'google/gemini-2.5-pro';

// Cache directory
const CACHE_DIR = '/tmp/.translation_cite_cache';

// Source templates (imported from templates.ts - single source of truth)
const SOURCE_TEMPLATES = RESPONSE_TEMPLATES;

type RiskLevel = keyof typeof SOURCE_TEMPLATES;
type AgeBand = 'adult' | 'minor';

interface TranslationCache {
  [hash: string]: string;
}

/**
 * Generate cache key from text, model, and target language
 */
function getCacheKey(text: string, model: string, targetLang: string): string {
  const hash = createHash('sha256')
    .update(`${text}||${model}||${targetLang}`)
    .digest('hex');
  return hash;
}

/**
 * Load cache from disk
 */
async function loadCache(): Promise<TranslationCache> {
  const cachePath = path.join(CACHE_DIR, 'translations.json');

  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }

  if (!existsSync(cachePath)) {
    return {};
  }

  try {
    const content = await readFile(cachePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('⚠️  Could not load cache, starting fresh');
    return {};
  }
}

/**
 * Save cache to disk
 */
async function saveCache(cache: TranslationCache): Promise<void> {
  const cachePath = path.join(CACHE_DIR, 'translations.json');
  await writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * Translate text using LLM with safety guidelines
 */
async function translateText(
  provider: OpenRouterProvider,
  text: string,
  targetLang: { code: string; name: string; locale: string },
  riskLevel: RiskLevel,
  ageBand: AgeBand,
  cache: TranslationCache
): Promise<string> {
  const cacheKey = getCacheKey(text, TRANSLATION_MODEL, targetLang.code);

  // Check cache first
  if (cache[cacheKey]) {
    console.log(`  ✓ Using cached translation for ${targetLang.name}`);
    return cache[cacheKey];
  }

  console.log(`  🔄 Translating to ${targetLang.name}...`);

  const systemPrompt = `You are a professional translator specializing in mental health crisis support materials.

Your task is to translate mental health safety messages while preserving:
1. Tone and emotional urgency appropriate to the risk level
2. Cultural appropriateness for the target language/region
3. Action-oriented guidance (preserve bullet points, formatting)
4. Professional yet warm tone

Risk Level: ${riskLevel}
Age Band: ${ageBand}
Target Language: ${targetLang.name} (${targetLang.locale})

CRITICAL GUIDELINES:
- Maintain the exact level of urgency (don't soften critical risk messages)
- Preserve all formatting (bullet points, bold/emphasis markers like **)
- Use culturally appropriate ways to express empathy and urgency
- Keep technical terms accurate (crisis helpline, emergency services, etc.)
- For youth messages, use age-appropriate language in the target culture

OUTPUT FORMAT:
You must wrap your translation in XML tags like this:

<TRANSLATION>
Your translated text here
</TRANSLATION>

Example:
Input: "I'm here to listen. How are you feeling?"
Output:
<TRANSLATION>
Estoy aquí para escuchar. ¿Cómo te sientes?
</TRANSLATION>

DO NOT include any explanations, notes, or commentary outside the <TRANSLATION> tags.`;

  const userMessage = text;

  let fullText = '';

  for await (const chunk of provider.streamChat({
    model: TRANSLATION_MODEL,
    messages: [{ role: 'user', content: userMessage }],
    systemPrompt,
    temperature: 0.3, // Lower temperature for more consistent translations
  })) {
    if (chunk.type === 'content' && chunk.content) {
      fullText += chunk.content;
    } else if (chunk.type === 'error' && chunk.error) {
      throw new Error(chunk.error);
    }
  }

  // Extract translation from XML tags
  const translationMatch = fullText.match(/<TRANSLATION>\s*([\s\S]*?)\s*<\/TRANSLATION>/);
  const translated = translationMatch ? translationMatch[1].trim() : fullText.trim();

  // Cache the result immediately (so we don't lose it on failure)
  cache[cacheKey] = translated;
  await saveCache(cache);

  console.log(`  ✓ Translated to ${targetLang.name}`);

  return translated;
}

/**
 * Generate TypeScript file with all translations
 */
function generateTypeScriptFile(
  translations: Record<string, Record<RiskLevel, Record<AgeBand, string>>>
): string {
  const lines: string[] = [];

  lines.push('/**');
  lines.push(' * Multilingual Safe Response Templates');
  lines.push(' *');
  lines.push(' * AUTO-GENERATED by scripts/translate-templates.ts');
  lines.push(' * DO NOT EDIT MANUALLY - Run: pnpm build:translations');
  lines.push(' *');
  lines.push(` * Generated: ${new Date().toISOString()}`);
  lines.push(` * Model: ${TRANSLATION_MODEL}`);
  lines.push(' * Languages: ' + TARGET_LANGUAGES.map(l => l.name).join(', '));
  lines.push(' */');
  lines.push('');
  lines.push("import type { RiskLevel } from '../classification/types/index.js';");
  lines.push('');
  lines.push('export type SupportedLanguage =');
  lines.push('  | ' + TARGET_LANGUAGES.map(l => `'${l.code}'`).join('\n  | ') + ';');
  lines.push('');
  lines.push('export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {');
  for (const lang of TARGET_LANGUAGES) {
    lines.push(`  '${lang.code}': '${lang.name}',`);
  }
  lines.push('};');
  lines.push('');
  lines.push('export const LANGUAGE_LOCALES: Record<SupportedLanguage, string> = {');
  for (const lang of TARGET_LANGUAGES) {
    lines.push(`  '${lang.code}': '${lang.locale}',`);
  }
  lines.push('};');
  lines.push('');
  lines.push('export const MULTILINGUAL_TEMPLATES: Record<');
  lines.push('  SupportedLanguage,');
  lines.push('  Record<RiskLevel, { adult: string; minor: string }>');
  lines.push('> = {');

  for (const [langCode, riskLevels] of Object.entries(translations)) {
    lines.push(`  '${langCode}': {`);

    for (const [riskLevel, ageBands] of Object.entries(riskLevels)) {
      lines.push(`    ${riskLevel}: {`);
      lines.push(`      adult: ${JSON.stringify(ageBands.adult)},`);
      lines.push(`      minor: ${JSON.stringify(ageBands.minor)},`);
      lines.push(`    },`);
    }

    lines.push(`  },`);
  }

  lines.push('};');
  lines.push('');
  lines.push('/**');
  lines.push(' * Get safe response for risk level, age band, and language');
  lines.push(' */');
  lines.push('export function getMultilingualSafeResponse(');
  lines.push('  risk_level: RiskLevel,');
  lines.push("  age_band: 'adult' | 'minor' | 'unknown' = 'adult',");
  lines.push("  language: string = 'en'");
  lines.push('): string {');
  lines.push("  const ageBand = age_band === 'minor' ? 'minor' : 'adult';");
  lines.push('  ');
  lines.push('  // Extract language code from locale if needed (e.g., "en-US" -> "en")');
  lines.push("  const langCode = language.split('-')[0].toLowerCase();");
  lines.push('  ');
  lines.push('  // Check if we have translations for this language');
  lines.push('  if (langCode in MULTILINGUAL_TEMPLATES) {');
  lines.push('    return MULTILINGUAL_TEMPLATES[langCode as SupportedLanguage][risk_level][ageBand];');
  lines.push('  }');
  lines.push('  ');
  lines.push("  // Fallback to English");
  lines.push("  return MULTILINGUAL_TEMPLATES['en'][risk_level][ageBand];");
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

/**
 * Ask user for confirmation to overwrite existing file
 */
async function confirmOverwrite(filePath: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const answer = await rl.question('Continue? (Y/n): ');
    return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

/**
 * Main translation process
 */
async function main() {
  console.log('🌍 CITE Template Translation Builder');
  console.log('=====================================\n');

  // Check if output file already exists
  const outputPath = path.join(process.cwd(), 'lib/responses/templates.multilingual.ts');
  if (existsSync(outputPath)) {
    console.warn('⚠️  WARNING: Existing translation file found!');
    console.warn(`   ${outputPath}`);
    console.warn('');
    console.warn('   This will OVERWRITE the existing translations.');
    console.warn('   All current translations will be replaced.\n');

    const confirmed = await confirmOverwrite(outputPath);
    if (!confirmed) {
      console.log('\n❌ Translation cancelled by user.');
      process.exit(0);
    }
    console.log('');
  }

  // Check for API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY environment variable not set');
    process.exit(1);
  }

  // Initialize provider
  const provider = new OpenRouterProvider(apiKey);

  // Load cache
  console.log('📦 Loading translation cache...');
  const cache = await loadCache();
  console.log(`   Found ${Object.keys(cache).length} cached translations\n`);

  // Translation results
  const translations: Record<string, Record<RiskLevel, Record<AgeBand, string>>> = {};

  const riskLevels: RiskLevel[] = ['none', 'low', 'medium', 'high', 'critical'];
  const ageBands: AgeBand[] = ['adult', 'minor'];

  let totalTranslations = 0;
  let cachedTranslations = 0;
  let newTranslations = 0;

  // Build list of all translation tasks
  interface TranslationTask {
    targetLang: typeof TARGET_LANGUAGES[number];
    riskLevel: RiskLevel;
    ageBand: AgeBand;
    sourceText: string;
  }

  const tasks: TranslationTask[] = [];

  for (const targetLang of TARGET_LANGUAGES) {
    translations[targetLang.code] = {} as Record<RiskLevel, Record<AgeBand, string>>;

    for (const riskLevel of riskLevels) {
      translations[targetLang.code][riskLevel] = {} as Record<AgeBand, string>;

      for (const ageBand of ageBands) {
        const sourceText = SOURCE_TEMPLATES[riskLevel][ageBand];
        totalTranslations++;

        // Handle English (source language) - no translation needed
        if (targetLang.code === 'en') {
          translations[targetLang.code][riskLevel][ageBand] = sourceText;
          cachedTranslations++;
        } else {
          tasks.push({ targetLang, riskLevel, ageBand, sourceText });
        }
      }
    }
  }

  console.log(`\n🚀 Translating ${tasks.length} items in parallel...\n`);

  // Run all translations in parallel with fault tolerance
  const translationPromises = tasks.map(async (task) => {
    const { targetLang, riskLevel, ageBand, sourceText } = task;

    try {
      const translated = await translateText(
        provider,
        sourceText,
        targetLang,
        riskLevel,
        ageBand,
        cache
      );

      return {
        success: true as const,
        targetLang,
        riskLevel,
        ageBand,
        translated,
        sourceText
      };
    } catch (error) {
      console.error(`\n❌ Failed: ${targetLang.name} / ${riskLevel} / ${ageBand}`);
      return {
        success: false as const,
        targetLang,
        riskLevel,
        ageBand,
        error: error instanceof Error ? error.message : String(error),
        sourceText
      };
    }
  });

  // Wait for all translations to complete (including failures)
  const results = await Promise.all(translationPromises);

  // Track failures
  const failures: Array<{ lang: string; riskLevel: string; ageBand: string; error: string }> = [];

  // Store results and track stats
  for (const result of results) {
    if (result.success) {
      const { targetLang, riskLevel, ageBand, translated, sourceText } = result;
      translations[targetLang.code][riskLevel][ageBand] = translated;

      // Track stats
      const cacheKey = getCacheKey(sourceText, TRANSLATION_MODEL, targetLang.code);
      const wasCached = cache[cacheKey] !== undefined;

      if (wasCached) {
        cachedTranslations++;
      } else {
        newTranslations++;
      }
    } else {
      // Translation failed - use English fallback
      const { targetLang, riskLevel, ageBand, error } = result;
      translations[targetLang.code][riskLevel][ageBand] = SOURCE_TEMPLATES[riskLevel][ageBand];

      failures.push({
        lang: targetLang.name,
        riskLevel,
        ageBand,
        error,
      });
    }
  }

  // Save updated cache
  console.log('\n\n💾 Saving translation cache...');
  await saveCache(cache);

  // Generate TypeScript file
  console.log('📝 Generating TypeScript file...');
  const tsContent = generateTypeScriptFile(translations);
  await writeFile(outputPath, tsContent, 'utf-8');

  // Summary
  if (failures.length > 0) {
    console.log('\n\n⚠️  Translation Completed with Failures');
    console.log('═'.repeat(50));
    console.log(`Total translations: ${totalTranslations}`);
    console.log(`✓ Cached: ${cachedTranslations}`);
    console.log(`✓ New: ${newTranslations}`);
    console.log(`❌ Failed: ${failures.length}`);
    console.log(`Languages: ${TARGET_LANGUAGES.length}`);
    console.log('\n❌ Failures (using English fallback):');
    for (const failure of failures) {
      console.log(`   - ${failure.lang} / ${failure.riskLevel} / ${failure.ageBand}`);
      console.log(`     Error: ${failure.error}`);
    }
    console.log('\n💡 You can re-run this command to retry failed translations.');
    console.log('   Successful translations are cached and will be skipped.');
    console.log(`\nOutput: lib/responses/templates.multilingual.ts`);
    console.log(`Cache: ${CACHE_DIR}/translations.json`);
    console.log('═'.repeat(50));
  } else {
    console.log('\n\n✅ Translation Complete!');
    console.log('═'.repeat(50));
    console.log(`Total translations: ${totalTranslations}`);
    console.log(`Cached: ${cachedTranslations}`);
    console.log(`New: ${newTranslations}`);
    console.log(`Languages: ${TARGET_LANGUAGES.length}`);
    console.log(`Output: lib/responses/templates.multilingual.ts`);
    console.log(`Cache: ${CACHE_DIR}/translations.json`);
    console.log('═'.repeat(50));
  }
}

main().catch(error => {
  console.error('\n❌ Translation failed:', error);
  process.exit(1);
});
