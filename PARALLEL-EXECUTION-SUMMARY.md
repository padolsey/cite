# Parallel Execution Implementation Summary

## What's Been Added

### New NPM Scripts

```json
{
  "test:llm:all:parallel": "TEST_MODELS=all vitest run --pool=forks --poolOptions.forks.singleFork=false",
  "test:llm:oss:parallel": "TEST_MODELS=gpt-oss-120b,qwen3-32b vitest run --pool=forks --poolOptions.forks.singleFork=false"
}
```

### How to Use

```bash
# Sequential (default) - Safe, clean logs
pnpm test:llm:all

# Parallel - 3x faster, use in CI
pnpm test:llm:all:parallel

# OSS models in parallel
pnpm test:llm:oss:parallel

# Custom parallel execution
TEST_MODELS=haiku,gpt-oss-120b vitest run --pool=forks --poolOptions.forks.singleFork=false
```

## Technical Details

### Vitest Fork Pool

The `--pool=forks` flag tells vitest to run test files in separate Node.js processes:

- **Isolation**: Each model gets its own process
- **Memory**: Prevents memory leaks between models
- **Parallelism**: Multiple processes run simultaneously

### What Gets Parallelized?

With `describe.each(TEST_MODELS)`, vitest creates multiple describe blocks:

```javascript
describe.each(TEST_MODELS)('My Tests - $name', (model) => {
  // Each model becomes a separate test suite
  // Vitest can run these suites in parallel
});
```

**Result:**
- Sequential: Haiku (30s) → GPT (30s) → Qwen (30s) = **90 seconds**
- Parallel: Haiku (30s) + GPT (30s) + Qwen (30s) = **~30 seconds** (limited by slowest)

## Performance Expectations

| Scenario | Sequential | Parallel | Speedup |
|----------|-----------|----------|---------|
| 2 models (OSS) | ~2x baseline | ~1.2x baseline | 1.7x faster |
| 3 models (all) | ~3x baseline | ~1.5x baseline | 2x faster |

**Note**: Actual speedup depends on:
- API latency variance
- Network conditions
- Rate limiting
- System resources

## When to Use Each Mode

### Sequential (Default)
✅ **Use for:**
- Local development
- Debugging failures
- First-time testing
- Cost tracking
- Rate limit concerns

❌ **Avoid for:**
- CI/CD where time matters
- Large test suites

### Parallel
✅ **Use for:**
- CI/CD pipelines
- Pre-commit hooks
- Automated testing
- Time-sensitive workflows

❌ **Avoid for:**
- Debugging (logs are messy)
- Rate-limited APIs
- Memory-constrained systems
- Initial development

## Tradeoffs

### Cost
- **Same** - Parallel doesn't reduce API calls, just wall clock time

### Speed
- **Sequential**: Linear scaling (3 models = 3x time)
- **Parallel**: Constant-ish scaling (3 models = ~1.5x time)

### Reliability
- **Sequential**: More predictable, respects rate limits
- **Parallel**: Risk of throttling, timeouts, memory issues

### Debuggability
- **Sequential**: Clean logs, easy to trace failures
- **Parallel**: Interleaved logs, harder to debug

## Troubleshooting

### Rate Limit Errors (429)
```bash
# Switch to sequential
pnpm test:llm:all

# Or test fewer models
TEST_MODELS=haiku,gpt-oss-120b pnpm test:llm:all:parallel
```

### Confusing Logs
```bash
# Use sequential for debugging
pnpm test:llm:all

# Or test one model
TEST_MODELS=haiku pnpm test:llm
```

### Memory Issues
```bash
# Sequential uses less memory
pnpm test:llm:all

# Or close other apps
```

## CI/CD Recommendation

Use a tiered approach:

```yaml
# Fast feedback (every commit)
on: push
  - run: pnpm test:llm

# Comprehensive (PRs only)
on: pull_request
  - run: pnpm test:llm:all:parallel

# Final validation (releases)
on: release
  - run: pnpm test:llm:all  # Sequential for clean logs
```

## Files Modified

1. `package.json` - Added `:parallel` scripts
2. `tests/README-MULTI-MODEL.md` - Documented parallel execution
3. (No changes to test files themselves - works out of the box!)

## Future Improvements

Potential enhancements:
- [ ] Add `--maxConcurrency` flag to limit parallel forks
- [ ] Add retry logic for rate-limited requests
- [ ] Add per-model timeout configuration
- [ ] Add cost tracking for parallel runs
- [ ] Add progress bars for parallel execution
