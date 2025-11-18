# Multi-Model LLM Testing

This test suite supports running the same E2E tests across multiple LLM models to ensure robustness and model diversity.

## Quick Start

```bash
# Default: Test with Haiku only (fast, cheap)
pnpm test:llm

# Test with all available models (sequential, safer)
pnpm test:llm:all

# Test with all available models (parallel, faster)
pnpm test:llm:all:parallel

# Test with OSS models only
pnpm test:llm:oss

# Test with OSS models in parallel
pnpm test:llm:oss:parallel

# Custom model selection
TEST_MODELS=haiku,gpt-oss-120b pnpm test:llm

# Custom with parallel execution
TEST_MODELS=haiku,gpt-oss-120b vitest run --pool=forks --poolOptions.forks.singleFork=false
```

## Available Models

1. **Haiku 4.5** (`anthropic/claude-haiku-4.5`)
   - Default model for development
   - Fast, cheap, reliable
   - Recommended for everyday testing

2. **GPT OSS 120B** (`openai/gpt-oss-120b`)
   - OpenAI's open-source model
   - Good for diversity testing
   - Lower cost than proprietary models

3. **Qwen3 32B** (`qwen/qwen3-32b`)
   - Chinese OSS model
   - Tests multilingual handling
   - Good performance for the size

## Environment Variable Syntax

### `TEST_MODELS` Options

```bash
# Single model (short name)
TEST_MODELS=haiku pnpm test:llm

# Multiple models (comma-separated)
TEST_MODELS=haiku,gpt-oss-120b pnpm test:llm

# All models
TEST_MODELS=all pnpm test:llm

# Full model IDs work too
TEST_MODELS=anthropic/claude-haiku-4.5 pnpm test:llm
```

### Model Aliases

You can use short aliases instead of full IDs:
- `haiku` → `anthropic/claude-haiku-4.5`
- `gpt-oss-120b` → `openai/gpt-oss-120b`
- `qwen3-32b` → `qwen/qwen3-32b`

## Sequential vs Parallel Execution

### Sequential (Default) - Recommended for Development

```bash
pnpm test:llm:all
```

**Pros:**
- 🐛 **Easier debugging** - Clean, sequential logs
- 📊 **Better visibility** - See per-model results clearly
- 🔒 **Safer** - Respects rate limits, avoids throttling
- 💰 **Cost tracking** - Easy to see which model is expensive
- 🎯 **Predictable** - Consistent timing and behavior

**Cons:**
- ⏱️ **Slower** - Models run one after another (~3x time for 3 models)

**Use when:**
- Developing and iterating on tests
- Debugging model-specific failures
- Running locally on slow/metered connections
- Cost tracking is important

### Parallel - Recommended for CI/CD

```bash
pnpm test:llm:all:parallel
```

**Pros:**
- ⚡ **3x faster** - Models run concurrently
- 🚀 **Better CI times** - Faster feedback in pipelines

**Cons:**
- 🔥 **Rate limiting risk** - May hit OpenRouter throttles
- 🐛 **Harder debugging** - Interleaved logs
- 💾 **Higher memory** - 3x simultaneous contexts
- ❌ **Potential flakiness** - Timeouts if one model is slow

**Use when:**
- Running in CI/CD where speed matters
- You have good rate limits with OpenRouter
- Tests are stable (not debugging)
- Time > debuggability

## NPM Scripts

### `pnpm test:llm`
Default LLM tests with Haiku only. Fast and cheap for development.

### `pnpm test:llm:all` (Sequential)
Runs all tests against all available models. Use for comprehensive validation before releases.

**Cost**: 3x the API calls of default tests
**Time**: ~3x slower (models run one after another)

### `pnpm test:llm:all:parallel` (Parallel)
Same as above but runs models concurrently using vitest's fork pool.

**Cost**: 3x the API calls (same as sequential)
**Time**: ~1-1.5x slower (much faster, limited by slowest model)
**⚠️ Warning**: May hit rate limits if running too frequently

### `pnpm test:llm:oss` (Sequential)
Runs tests against OSS models only (GPT OSS 120B + Qwen3 32B). Good for validating that prompts work across different architectures.

**Cost**: 2x the API calls, but cheaper models
**Time**: ~2x slower

### `pnpm test:llm:oss:parallel` (Parallel)
Same as above but runs OSS models concurrently.

**Cost**: 2x the API calls (same as sequential)
**Time**: ~1-1.2x slower (faster than sequential)

## How It Works

The `tests/helpers/test-models.ts` module provides:

1. **`getTestModels()`** - Parses `TEST_MODELS` env var and returns model configurations
2. **`logTestModels()`** - Pretty-prints which models are being tested
3. **`AVAILABLE_MODELS`** - Registry of supported models

Each LLM test file uses vitest's `describe.each()` to run the same test suite for each model:

```typescript
import { getTestModels, logTestModels } from '../helpers/test-models.js';

const TEST_MODELS = getTestModels();

describe.each(TEST_MODELS)('My Test Suite - $name', (model) => {
  let classifier: RiskClassifier;

  beforeAll(() => {
    classifier = new RiskClassifier(provider, { models: [model.id] });
  });

  // Tests run once per model
  test('example test', async () => {
    // ...
  });
});
```

## Test Output

When running multi-model tests, you'll see:

```
🧪 Testing with models:
   - Haiku 4.5: anthropic/claude-haiku-4.5
   - GPT OSS 120B: openai/gpt-oss-120b
   - Qwen3 32B: qwen/qwen3-32b

 ✓ Evaluate Endpoint Integration (E2E) - Haiku 4.5 (8 tests)
 ✓ Evaluate Endpoint Integration (E2E) - GPT OSS 120B (8 tests)
 ✓ Evaluate Endpoint Integration (E2E) - Qwen3 32B (8 tests)
```

## Best Practices

### During Development
Use default Haiku-only tests for fast iteration:
```bash
pnpm test:llm
```

### Before Pull Requests
Run all models to catch model-specific issues:
```bash
# Sequential - safer, easier to debug
pnpm test:llm:all

# Or parallel if you're in a hurry
pnpm test:llm:all:parallel
```

### CI/CD
Consider this progression:

**On every commit:**
```bash
pnpm test:llm  # Fast Haiku-only tests
```

**On pull request:**
```bash
pnpm test:llm:all:parallel  # All models, parallel for speed
```

**Before release:**
```bash
pnpm test:llm:all  # Sequential for clean logs and debugging
```

**Recommended GitHub Actions setup:**
```yaml
# .github/workflows/test.yml
jobs:
  test-fast:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test:llm  # Every commit

  test-comprehensive:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - run: pnpm test:llm:all:parallel  # PRs only
```

### Debugging Model-Specific Failures

If a specific model fails:
```bash
# Test just that model
TEST_MODELS=gpt-oss-120b pnpm test:llm

# With debug logging
TEST_MODELS=gpt-oss-120b pnpm test:llm:debug
```

## Adding New Models

To add a new model to the test suite:

1. Add to `AVAILABLE_MODELS` in `tests/helpers/test-models.ts`:

```typescript
{
  id: 'provider/model-name',
  name: 'Display Name',
  description: 'Brief description',
}
```

2. Test it:
```bash
TEST_MODELS=your-model-alias pnpm test:llm
```

3. Update `test:llm:all` or create new npm scripts as needed

## How Parallel Execution Works

The `:parallel` scripts use vitest's **fork pool** to run test files concurrently:

```bash
--pool=forks --poolOptions.forks.singleFork=false
```

- `--pool=forks`: Run tests in separate processes (isolates memory)
- `--poolOptions.forks.singleFork=false`: Allow multiple forks (default is single fork)

### What Gets Parallelized?

With `describe.each(TEST_MODELS)`, vitest creates separate describe blocks for each model:

```
✓ Live Classification Validation - Haiku 4.5
✓ Live Classification Validation - GPT OSS 120B  } Can run in parallel
✓ Live Classification Validation - Qwen3 32B
```

Each describe block is a separate test suite, and vitest can run them in different processes.

### Parallelization vs Concurrency

- **Sequential**: Model 1 finishes → Model 2 starts → Model 3 starts
- **Parallel**: Model 1, 2, and 3 all start at the same time

**Result**: Wall clock time is roughly the same as the **slowest model**, not the sum of all models.

## Cost Considerations

Running all models multiplies API costs by the number of models:

| Command | Models | Cost Multiplier | Time (Sequential) | Time (Parallel) |
|---------|--------|-----------------|-------------------|-----------------|
| `pnpm test:llm` | 1 (Haiku) | 1x (baseline) | 1x | 1x |
| `pnpm test:llm:oss` | 2 (OSS models) | ~1.5x (cheaper) | ~2x | ~1-1.2x |
| `pnpm test:llm:all` | 3 (all models) | ~2.5x (mixed) | ~3x | ~1-1.5x |

**Key Insight**: Parallel execution is **same cost**, just faster wall clock time.

**Tip**: Run full test suite sparingly. Use Haiku for development, all models for validation.

## Troubleshooting

### "Unknown model X in TEST_MODELS"
You specified a model that's not in the registry. Check available models in `tests/helpers/test-models.ts`.

### "No valid models found in TEST_MODELS"
None of your specified models matched. Falls back to Haiku. Check spelling/aliases.

### Tests pass on Haiku but fail on other models
Different models have different strengths. You may need to:
- Adjust prompt wording for clarity
- Relax confidence thresholds
- Review risk type expectations

This is valuable feedback! It means your prompts are overfitted to Haiku.

### Parallel execution hits rate limits

If you see 429 errors or timeout failures in parallel mode:

```bash
# Solution 1: Use sequential mode
pnpm test:llm:all

# Solution 2: Add delays between requests (in your code)
# Solution 3: Reduce model count
TEST_MODELS=haiku,gpt-oss-120b pnpm test:llm --pool=forks

# Solution 4: Run a specific test file in parallel
pnpm vitest run tests/integration/evaluate-endpoint.llm.test.ts --pool=forks
```

### Logs are confusing in parallel mode

Parallel execution interleaves output from multiple processes. To debug:

```bash
# Run sequential for clean logs
pnpm test:llm:all

# Or run a single model
TEST_MODELS=haiku pnpm test:llm

# Or run a specific test
pnpm vitest run tests/validation/live-validation.llm.test.ts
```

### Out of memory errors in parallel mode

Running 3 models simultaneously can use significant RAM:

```bash
# Solution: Use sequential mode
pnpm test:llm:all

# Or reduce models
TEST_MODELS=haiku,gpt-oss-120b pnpm test:llm:all:parallel
```
