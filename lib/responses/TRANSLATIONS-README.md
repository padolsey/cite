# Multilingual Safe Response Templates

## Overview

CITE's safe response templates are automatically translated into 10 languages using frontier LLM models. This provides locale-specific crisis support messaging without additional LLM costs at runtime.

## Supported Languages

1. **English** (en) - en-US
2. **Chinese Mandarin** (zh) - zh-CN
3. **Spanish** (es) - es-ES
4. **Arabic** (ar) - ar-SA
5. **Indonesian** (id) - id-ID
6. **Portuguese** (pt) - pt-BR
7. **French** (fr) - fr-FR
8. **Japanese** (ja) - ja-JP
9. **Russian** (ru) - ru-RU
10. **German** (de) - de-DE

These languages cover:
- **~5+ billion speakers** globally
- **Top languages for AI/mental health services**
- **Regions with established crisis support infrastructure**

## How It Works

### 1. Build Process

```bash
# Generate all translations
pnpm build:translations
```

This:
1. Reads English templates from `templates.ts`
2. For each risk level × age band × language:
   - Checks cache (`/tmp/.translation_cite_cache/translations.json`)
   - If not cached, calls GPT-4o to translate
   - Saves translation to cache
3. Generates `templates.multilingual.ts` with all translations

### 2. Runtime Usage

The `getSafeResponse()` function automatically uses multilingual templates:

```typescript
// Language detected during classification
const { language } = await classifier.classifyRisk(messages);

// Automatically returns response in detected language
const reply = getSafeResponse(risk_level, age_band, language);
```

**Fallback**: If translations not built or language unsupported, falls back to English.

## Translation Model

**Default**: `google/gemini-2.5-pro`

Why Gemini 2.5 Pro?
- ✅ Best-in-class multilingual capabilities on OpenRouter
- ✅ Superior cultural adaptation for safety-critical content
- ✅ **Very low cost** - ~$0.14 for all 10 languages
- ✅ Maintains tone and urgency across languages perfectly

## Cost Analysis

### One-time Translation Cost

**Per full build** (10 languages × 5 risk levels × 2 age bands = 100 translations):

| Item | Tokens | Cost |
|------|--------|------|
| Input (system prompts + source) | ~54,000 | ~$0.07 |
| Output (translations) | ~13,500 | ~$0.07 |
| **Total** | ~67,500 | **~$0.14** |

**With caching**: Subsequent builds use cache for unchanged templates (cost: $0).

### Runtime Cost

**$0** - Translations are static and embedded in code.

## Cache Management

### Cache Location

`/tmp/.translation_cite_cache/translations.json`

### Cache Structure

```json
{
  "sha256_hash(text||model||target_lang)": "translated text"
}
```

### Cache Benefits

1. **Idempotent builds** - Re-running produces same output
2. **Fast iteration** - Only translates new/changed content
3. **Cost savings** - Avoid re-translating unchanged templates

### Clearing Cache

```bash
rm -rf /tmp/.translation_cite_cache
```

Force full rebuild on next `pnpm build:translations`.

## Translation Quality

### Guidelines

Each translation preserves:
1. **Tone & urgency** - Critical messages stay critical
2. **Cultural appropriateness** - Adapted to target culture
3. **Formatting** - Bullet points, emphasis markers (**bold**)
4. **Technical accuracy** - "crisis helpline", "emergency services"
5. **Age-appropriate language** - Youth messages use appropriate tone

### Model Instructions

The translation prompt includes:
- Risk level context (none/low/medium/high/critical)
- Age band context (adult/minor)
- Target locale (e.g., es-ES vs es-MX)
- Mental health safety guidelines
- Formatting preservation instructions

### Review Process

**Recommended**:
1. Generate translations
2. Have native speakers review critical/high risk messages
3. Manual corrections can be made in `templates.multilingual.ts`
4. Cache key changes if source text changes (auto-retranslates)

## File Structure

```
lib/responses/
├── templates.ts                  # Source (English) templates
├── templates.multilingual.ts     # Generated translations (gitignored)
├── TRANSLATIONS-README.md        # This file
```

## Development Workflow

### Initial Setup

```bash
# Generate translations for the first time
pnpm build:translations
```

### Updating Templates

1. Edit English templates in `templates.ts`
2. Run `pnpm build:translations`
3. Only changed templates are re-translated (cache hit rate: ~90%)

### Adding a Language

1. Edit `scripts/translate-templates.ts`
2. Add language to `TARGET_LANGUAGES` array
3. Run `pnpm build:translations`
4. Review translations for new language

### Testing Translations

```typescript
import { getMultilingualSafeResponse } from './templates.multilingual.js';

// Test Spanish critical adult response
console.log(getMultilingualSafeResponse('critical', 'adult', 'es'));

// Test Chinese medium minor response
console.log(getMultilingualSafeResponse('medium', 'minor', 'zh'));
```

## CI/CD Integration

### Option 1: Pre-build (Recommended)

Generate translations locally and commit:

```bash
pnpm build:translations
git add lib/responses/templates.multilingual.ts
git commit -m "Update translations"
```

**Pros**:
- No API keys in CI
- Faster builds
- Reviewable translations

**Cons**:
- Manual step

### Option 2: Build in CI

Add to CI pipeline:

```yaml
- name: Generate translations
  env:
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  run: pnpm build:translations
```

**Pros**:
- Automated
- Always up to date

**Cons**:
- Requires API key in CI
- Costs ~$0.86 per build (with empty cache)
- Slower builds

## Performance

### Bundle Size Impact

- **English only**: ~2 KB
- **10 languages**: ~20 KB (gzipped)

Minimal impact on bundle size.

### Runtime Performance

- **No LLM calls** - Translations are static strings
- **Instant** - Simple object lookup
- **Fallback** - Gracefully degrades to English if needed

## Maintenance

### When to Rebuild

1. **Templates change** - English text updated
2. **New language added** - Added to `TARGET_LANGUAGES`
3. **Model upgraded** - Better translation model available
4. **Quality issues** - Fix specific translations manually

### Monitoring

Check warnings in production logs:

```
Multilingual templates not available, using English fallback
```

Indicates `templates.multilingual.ts` not built or not deployed.

## Example Output

### Spanish (es) - Critical Risk, Adult

```
Estoy extremadamente preocupado por tu seguridad inmediata. Lo que estás
describiendo es una emergencia, y mereces ayuda y apoyo inmediatos.

**TOMA ACCIÓN AHORA - Elige lo que te parezca más posible:**

• **Contacta** una línea de ayuda en crisis de inmediato - están esperando
  para ayudarte
• **Ve** a la sala de emergencias más cercana
• **Llama** a los servicios de emergencia y diles que es una emergencia de
  salud mental
• **Comunícate** con alguien de confianza para que esté contigo ahora mismo

Tu dolor es real, pero puede cambiar. Mereces vivir y sentirte mejor que esto.

Necesito saber: ¿Estás seguro en este momento? ¿Has hecho algo para hacerte
daño? ¿Hay alguien contigo?
```

### Japanese (ja) - High Risk, Minor

```
今あなたがとても心配です。あなたが感じていることは深刻で、今すぐ助けが
必要で、それを受ける価値があります。

**今すぐ次のうちの一つを行ってください：**

• 今言ったことを親または信頼できる大人に伝えてください
• 危機支援ラインに連絡してください - 毎日若者を助けています
• 安全でないと感じたら、信頼できる大人と一緒に救急外来に行ってください
• 直接的な危険がある場合は緊急サービスに電話してください

あなたは負担ではありません。大人はあなたを助けたいと思っています。
あなたの命は大切です。

教えてください：今、安全ですか？近くに大人がいますか？
```

## Updating This README

This file should be updated when:
- New languages are added
- Translation model changes
- Cost estimates change
- Workflow changes

---

**Last Updated**: 2025-11-18
**Translation Model**: google/gemini-2.5-pro
**Supported Languages**: 10 (English, Chinese, Spanish, Arabic, Indonesian, Portuguese, French, Japanese, Russian, German)
**Build Cost**: ~$0.14 (one-time for all languages)
