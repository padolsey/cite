# Adaptive Model Selection System

## Overview

The CITE API now features an **adaptive model selection system** that automatically chooses the cheapest viable model for each request based on:

1. **Input context length** (conservative estimate: chars ÷ 3)
2. **Task-specific capabilities** (heuristically defined)
3. **Cost optimization** (cheapest model that meets requirements)
4. **Automatic fallback** on failure or timeout (10s default)
5. **Adaptive concurrency** using AIMD (Additive Increase, Multiplicative Decrease)

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│ ModelRegistry                                           │
│ - Defines all available models with specs              │
│ - Pricing, context limits, latency, capabilities       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ ModelSelector                                           │
│ - Selects cheapest viable model based on constraints   │
│ - Returns primary + fallbacks in priority order        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ ProviderWithFallback                                    │
│ - Wraps IProvider with timeout + retry logic           │
│ - Automatically tries next model on failure/timeout    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ AdaptiveModelPool (per model)                          │
│ - AIMD concurrency control (starts at 10, max 50)     │
│ - Increases on success, decreases on rate limits       │
│ - Queues requests when at limit                        │
└─────────────────────────────────────────────────────────┘
```

---

## Model Registry

**File**: `lib/providers/ModelRegistry.ts`

### Available Models (Sorted by Cost)

| Model | Context | Price (in/out per 1M) | Latency | Risk Classification | Safe Reply Gen |
|-------|---------|----------------------|---------|---------------------|----------------|
| **gpt-oss-20b** | 130k | $0.03 / $0.14 | 0.3-1s | ✅ | ❌ |
| **gpt-oss-120b** | 130k | $0.04 / $0.40 | 0.5-1.2s | ✅ | ✅ |
| **qwen3-32b** | 40k | $0.05 / $0.20 | 1-2s | ✅ | ✅ |
| **qwen3-30b-a3b** | 262k | $0.08 / $0.33 | 0.9-2s | ✅ | ✅ |
| **gemini-2.5-flash** | 1M | $0.30 / $2.50 | 0.6-1.4s | ✅ | ✅ |
| **kimi-k2-0905** | 260k | $0.39 / $1.90 | 0.7-2s | ✅ | ✅ |
| **claude-haiku-4.5** | 200k | $1.00 / $5.00 | 0.7-1.5s | ✅ | ✅ |

### Capability Constraints

Defined heuristically in `ModelRegistry.ts`:

```typescript
capabilities: {
  riskClassification: boolean;    // All models support this
  safeReplyGeneration: boolean;   // Only trusted models (excludes gpt-oss-20b)
  languageDetection: boolean;     // All models support this
}
```

**Rationale for Safe Reply Generation**:
- ❌ **gpt-oss-20b**: Not trusted (lower quality)
- ✅ **gpt-oss-120b, qwen3, haiku, gemini**: Trusted for safety-critical responses

---

## Model Selection Logic

**File**: `lib/providers/ModelSelector.ts`

### Selection Algorithm

```typescript
ModelSelector.selectModels({
  inputText: conversationText,           // OR estimatedInputTokens
  requiredCapabilities: {
    riskClassification: true,            // Required for this task
    safeReplyGeneration: false           // Not required for classification
  },
  maxLatencySeconds: 10                  // Optional timeout constraint
})
```

**Selection Steps**:
1. Estimate input tokens: `chars / 3` (conservative)
2. Filter models that meet requirements:
   - Context limit ≥ estimated tokens
   - All required capabilities = true
   - Latency ≤ max latency (if specified)
3. Sort by cost (input price per 1M tokens)
4. Return: `{ primary: cheapest, fallbacks: [others in price order] }`

### Examples

**Small input, risk classification only**:
```typescript
Input: "I feel sad today" (18 chars ≈ 6 tokens)
Selected: gpt-oss-20b ($0.03)  // Cheapest viable
Fallbacks: [gpt-oss-120b, qwen3-32b, ...]
```

**Small input, safe reply generation**:
```typescript
Input: "I feel sad today" (18 chars ≈ 6 tokens)
Required: safeReplyGeneration = true
Selected: gpt-oss-120b ($0.04)  // gpt-oss-20b excluded (not trusted)
Fallbacks: [qwen3-32b, qwen3-30b-a3b, ...]
```

**Large input (60k tokens)**:
```typescript
Input: Very long conversation (180k chars ≈ 60k tokens)
Required: riskClassification = true
Selected: gpt-oss-120b ($0.04)  // qwen3-32b excluded (only 40k context)
Fallbacks: [qwen3-30b-a3b, gemini-2.5-flash, ...]
```

---

## Fallback System

**File**: `lib/providers/ProviderWithFallback.ts`

### Timeout + Retry Logic

**Default timeout**: 10 seconds per model (configurable via `DEFAULT_MODEL_TIMEOUT_MS`)

**Behavior**:
1. Try primary model
2. If timeout (>10s) OR error → try first fallback
3. If timeout/error → try second fallback
4. Continue until success OR all models exhausted
5. Throw `AllModelsFailed` error with attempt details

**Timeout Implementation**:
- Resets on each chunk received (streaming is active)
- Throws `TimeoutError` if no chunks for 10s

### Example Flow

```typescript
// User request with 50k token input
ModelSelector selects:
  primary: gpt-oss-120b
  fallbacks: [qwen3-30b-a3b, gemini-2.5-flash, kimi-k2, haiku]

Attempt 1: gpt-oss-120b
  → Times out after 10s
  → Log: ❌ gpt-oss-120b failed: Timeout after 10000ms

Attempt 2: qwen3-30b-a3b [FALLBACK]
  → Succeeds in 1.2s
  → Log: ✅ qwen3-30b-a3b succeeded
  → Return results
```

---

## Adaptive Concurrency (AIMD)

**File**: `lib/providers/AdaptiveModelPool.ts`

### AIMD Algorithm Parameters

```typescript
INITIAL_CONCURRENCY: 10     // Start here
MIN_CONCURRENCY: 2          // Floor (never go below)
MAX_CONCURRENCY: 50         // Ceiling (never exceed)

SUCCESS_THRESHOLD: 10       // +1 after 10 successes
DECREASE_FACTOR: 0.5        // ×0.5 on rate limit (cut in half)
MIN_DECREASE: 1             // At least -1

DECREASE_COOLDOWN_MS: 5000  // 5s before another decrease allowed
IDLE_TIMEOUT_MS: 300000     // 5min idle → reset to initial
```

### AIMD Behavior

**Additive Increase** (gradual):
- After 10 consecutive successes → concurrency += 1
- Continues until MAX_CONCURRENCY (50)

**Multiplicative Decrease** (aggressive):
- On rate limit (429) → concurrency ×= 0.5 (cut in half)
- Never below MIN_CONCURRENCY (2)
- Cooldown: 5s before another decrease

**Idle Reset**:
- If no requests for 5 minutes → reset to INITIAL_CONCURRENCY (10)

### Example Timeline

```
t=0s    Concurrency: 10 (initial)
t=10s   10 successes → concurrency: 11 (+1)
t=20s   10 successes → concurrency: 12 (+1)
...
t=120s  Rate limit!  → concurrency: 6 (×0.5)
t=125s  Rate limit!  → [in cooldown, stays at 6]
t=130s  [cooldown expires]
t=140s  Rate limit!  → concurrency: 3 (×0.5)
t=150s  10 successes → concurrency: 4 (+1)
...
```

### Per-Model Pools

**One pool per model** (isolated rate limits):
- `poolManager.getPool('qwen/qwen3-32b')` → dedicated pool
- `poolManager.getPool('anthropic/claude-haiku-4.5')` → different pool
- Rate limit on one model doesn't affect others

---

## Integration Points

### 1. Risk Classification

**File**: `lib/classification/RiskClassifier.ts`

```typescript
// OLD (hardcoded)
this.judges = [new RiskLevelJudge(provider, 'qwen/qwen3-32b')];

// NEW (automatic selection)
const selection = ModelSelector.selectModels({
  inputText: conversationText,
  requiredCapabilities: { riskClassification: true }
});

const providerWithFallback = new ProviderWithFallback(
  this.baseProvider,
  [selection.primary, ...selection.fallbacks]
);

this.judges = [new RiskLevelJudge(providerWithFallback, selection.primary.id)];
```

**Logs**:
```
[RiskClassifier] Single-judge mode: Selected qwen/qwen3-32b (cost: $0.05/$0.20, context: 40,000, latency: 1-2s). Input tokens: 1,234. Fallbacks: qwen3-30b-a3b, gemini-2.5-flash, kimi-k2, haiku.
[ProviderWithFallback] Attempting qwen/qwen3-32b (1/5)
[ProviderWithFallback] ✅ qwen/qwen3-32b succeeded
```

### 2. Safe Reply Generation

**File**: `lib/evaluation/Evaluator.ts`

```typescript
// OLD (hardcoded)
this.provider.streamChat({ model: 'qwen/qwen3-32b', ... });

// NEW (automatic selection)
const selection = ModelSelector.selectModels({
  inputText: systemPrompt + userContent,
  requiredCapabilities: { safeReplyGeneration: true }  // ← Excludes gpt-oss-20b
});

const providerWithFallback = new ProviderWithFallback(
  this.provider,
  [selection.primary, ...selection.fallbacks]
);

providerWithFallback.streamChat({ model: selection.primary.id, ... });
```

**Logs**:
```
[Evaluator] Safe reply generation: Selected gpt-oss-120b (cost: $0.04/$0.40, context: 130,000, latency: 0.5-1.2s). Input tokens: 2,456. Fallbacks: qwen3-32b, qwen3-30b-a3b, gemini-2.5-flash.
[ProviderWithFallback] Attempting gpt-oss-120b (1/4)
[AdaptiveModelPool][gpt-oss-120b] Increased concurrency 10→11 (after 10 successes)
[ProviderWithFallback] ✅ gpt-oss-120b succeeded
```

---

## Configuration

### Global Timeout

**File**: `lib/providers/ProviderWithFallback.ts`

```typescript
export const DEFAULT_MODEL_TIMEOUT_MS = 10_000; // 10 seconds
```

### AIMD Parameters

**File**: `lib/providers/AdaptiveModelPool.ts`

```typescript
export const AIMD_CONFIG = {
  INITIAL_CONCURRENCY: 10,
  MIN_CONCURRENCY: 2,
  MAX_CONCURRENCY: 50,
  SUCCESS_THRESHOLD: 10,
  DECREASE_FACTOR: 0.5,
  MIN_DECREASE: 1,
  DECREASE_COOLDOWN_MS: 5000,
  IDLE_TIMEOUT_MS: 5 * 60 * 1000,
};
```

---

## Monitoring

### Pool State API

```typescript
import { poolManager } from './lib/providers/AdaptiveModelPool';

// Get state for all pools
const states = poolManager.getAllStates();

// Example output:
[
  {
    modelId: 'qwen/qwen3-32b',
    currentConcurrency: 12,
    activeRequests: 8,
    queuedRequests: 3,
    successCount: 4,
    totalSuccesses: 124,
    totalRateLimits: 2,
    totalErrors: 0,
    lastRateLimitTime: 1737235678123,
    lastRequestTime: 1737235890456,
    isInCooldown: false
  },
  ...
]
```

### Observability Logs

**Example log output**:
```
[RiskClassifier] Single-judge mode: Selected qwen/qwen3-32b (cost: $0.05/$0.20...)
[ProviderWithFallback] Attempting qwen/qwen3-32b (1/5)
[AdaptiveModelPool][qwen/qwen3-32b] Increased concurrency 10→11 (after 10 successes)
[ProviderWithFallback] ✅ qwen/qwen3-32b succeeded

[ProviderWithFallback] Attempting gpt-oss-120b (1/4)
[ProviderWithFallback] ❌ gpt-oss-120b failed: Timeout after 10000ms
[ProviderWithFallback] Trying next fallback...
[ProviderWithFallback] Attempting qwen3-30b-a3b (2/4) [FALLBACK]
[ProviderWithFallback] ✅ qwen3-30b-a3b succeeded

[AdaptiveModelPool][qwen/qwen3-32b] Rate limit detected! Decreased concurrency 12→6 (×0.5)
```

---

## Cost Optimization Examples

### Scenario 1: Standard Request (Small Input)

**Before (hardcoded qwen3-32b)**:
- Model: qwen3-32b
- Cost: $0.05 / $0.20 per 1M tokens

**After (adaptive selection)**:
- Model: gpt-oss-20b (for classification)
- Cost: $0.03 / $0.14 per 1M tokens
- **Savings: 40% on input, 30% on output**

### Scenario 2: Safe Reply Generation

**Before**:
- Model: qwen3-32b
- Cost: $0.05 / $0.20 per 1M tokens

**After**:
- Model: gpt-oss-120b (cheapest trusted model)
- Cost: $0.04 / $0.40 per 1M tokens
- **Savings: 20% on input** (output cost higher but acceptable for quality)

### Scenario 3: Very Large Context (100k tokens)

**Before**:
- Would fail (qwen3-32b only supports 40k)
- Fallback to haiku: $1.00 / $5.00

**After**:
- Model: gpt-oss-120b (130k context, $0.04)
- **Savings: 96% vs haiku**

---

## Testing

**File**: `tests/providers/model-selector.test.ts`

Run tests:
```bash
pnpm test tests/providers/model-selector.test.ts
```

**Test coverage**:
- ✅ Selects cheapest model for small inputs
- ✅ Excludes models that cannot fit input
- ✅ Respects capability constraints
- ✅ Returns fallbacks in price order
- ✅ Throws error when no viable models
- ✅ Token estimation (chars / 3)

---

## Migration Notes

### Breaking Changes

**None!** The system is backwards-compatible.

### Behavior Changes

1. **Model selection is now dynamic** (was hardcoded to qwen3-32b)
2. **Automatic fallback on timeout/failure** (was single attempt)
3. **Adaptive concurrency** (was unlimited)
4. **More verbose logging** (includes model selection reasoning)

### Observability Improvements

- Logs show which model was selected and why
- Logs show fallback attempts
- Pool state API for monitoring concurrency

---

## Future Enhancements

1. **Cost tracking**: Log actual spend per model/request
2. **A/B testing**: Compare model quality vs cost
3. **User feedback loop**: Adjust capabilities based on real performance
4. **Regional models**: Add geo-specific models (e.g., China-only models)
5. **Dynamic pricing**: Update MODEL_REGISTRY from API
6. **Circuit breaker**: Temporarily disable failing models

---

## Summary

The adaptive model selection system provides:

✅ **Cost optimization** (40%+ savings on typical requests)
✅ **Reliability** (automatic fallback on timeout/failure)
✅ **Scalability** (adaptive concurrency with AIMD)
✅ **Transparency** (detailed logging of selection reasoning)
✅ **Safety** (capability constraints prevent using untrusted models)

**Zero configuration required** - works out of the box with sensible defaults.
