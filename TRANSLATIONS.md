# Translation System - Quick Start

## Generate Translations

```bash
# Run once locally to generate all translations
pnpm build:translations
```

This generates `lib/responses/templates.multilingual.ts` with safe response templates in 10 languages.

## Commit to Git

```bash
# Translations are meant to be committed
git add lib/responses/templates.multilingual.ts
git commit -m "Add/update translations"
git push
```

## Languages Supported

1. English (en)
2. Chinese/Mandarin (zh)
3. Spanish (es)
4. Arabic (ar)
5. Indonesian (id)
6. Portuguese (pt)
7. French (fr)
8. Japanese (ja)
9. Russian (ru)
10. German (de)

**Coverage**: 5+ billion speakers globally

## How It Works

### At Build Time (Manual)
- Translates English templates using Gemini 2.5 Pro
- Caches translations to avoid re-doing work
- **Cost: ~$0.14** (one-time for all 10 languages)
- Run time: ~45 seconds first time, ~2 seconds cached

### At Runtime (Automatic)
- Language detected during risk classification
- Template selected in detected language
- Falls back to English if language not supported
- **Cost: $0** (no LLM call needed)

## When to Run

Run `pnpm build:translations` when:
1. **First time setup** - Generate initial translations
2. **Template changes** - English templates updated
3. **Adding languages** - New languages added to script

**You do NOT need to run this**:
- Before every build
- In CI/CD (translations are committed)
- When deploying

## Fallback Behavior

If translations not built or language unsupported:
- ✅ Automatically falls back to English
- ✅ Logs warning (not error)
- ✅ App continues to work

## Cost

| Component | Cost |
|-----------|------|
| Translation generation | **~$0.14** (one-time, Gemini 2.5 Pro) |
| Runtime (per eval) | **$0** (static templates) |

**Amortized cost**: ~$0.014/month if rebuilding monthly (negligible)

Compare to LLM-generated replies: $2.85/month for 10K evaluations

## Files

- **`scripts/translate-templates.ts`** - Translation script
- **`lib/responses/templates.multilingual.ts`** (generated) - All translations
- **`/tmp/.translation_cite_cache/`** - Translation cache (local)

## Documentation

- **`TRANSLATION-SYSTEM.md`** - Full architecture & workflow
- **`lib/responses/TRANSLATIONS-README.md`** - Technical details

## Example

```typescript
// User sends Spanish message
const result = await cite.evaluate({
  messages: [
    { role: 'user', content: 'Me siento muy mal' }
  ]
});

// Language auto-detected: "es"
// Returns Spanish template response:
result.safe_reply
// → "Gracias por compartir esto conmigo..."
```

**No configuration needed** - Just works!

---

**Questions?** See `TRANSLATION-SYSTEM.md` for full details.
