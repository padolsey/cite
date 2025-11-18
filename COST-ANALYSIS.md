# CITE API - Free Tier Cost Analysis

**Analysis Date**: 2025-11-18
**Free Tier Limit**: 10,000 evaluations/month

## Token Usage Estimation

### Per Evaluation (Single Judge Mode - Default)

Based on code analysis of the actual prompts and implementation:

**Input Tokens:**
- System Prompt (`RISK_LEVEL_CLASSIFICATION`): ~4,500 tokens
  - Comprehensive guidelines, examples, risk types, etc.
- Conversation (XML serialized): **Variable by scenario**
  - Short (1-3 messages): ~150 tokens
  - Medium (5-10 messages): ~400 tokens
  - Long (15-20 messages): ~1,000 tokens
  - **Average assumption**: ~400 tokens

**Total Input per Evaluation**: ~4,900 tokens
**Total Input for 10,000 evals**: 49,000,000 tokens (49M)

**Output Tokens:**
- Response includes:
  - Language detection (ISO code)
  - Locale (if detected)
  - Reflection (2-4 sentences explaining reasoning)
  - Classification (CLASS_NONE, CLASS_LOW, etc.)
  - Risk types with confidence scores (XML)
- **Average per evaluation**: ~200 tokens

**Total Output for 10,000 evals**: 2,000,000 tokens (2M)

---

## Cost Breakdown by Model

Prices are **per million tokens** (OpenRouter pricing as of Nov 2024):

| Model | Input $/M | Output $/M | Input Cost | Output Cost | **Total/Month** | Cost per Eval |
|-------|-----------|------------|------------|-------------|-----------------|---------------|
| **claude-haiku-4.5** | $1.00 | $5.00 | $49.00 | $10.00 | **$59.00** | $0.0059 |
| **claude-sonnet-4.5** | $3.00 | $15.00 | $147.00 | $30.00 | **$177.00** | $0.0177 |
| **claude-opus-4.1** | $15.00 | $75.00 | $735.00 | $150.00 | **$885.00** | $0.0885 |
| **gpt-4o** | $2.50 | $10.00 | $122.50 | $20.00 | **$142.50** | $0.0143 |
| **qwen3-32b** | $0.05 | $0.20 | $2.45 | $0.40 | **$2.85** | $0.0003 |
| **gpt-oss-120b** | $0.04 | $0.40 | $1.96 | $0.80 | **$2.76** | $0.0003 |

---

## Scenario Analysis

### Conservative Estimate (Shorter Conversations)
- Input: 4,650 tokens avg (4,500 prompt + 150 conversation)
- Output: 180 tokens avg
- **10K evaluations:**

| Model | Total Cost |
|-------|------------|
| claude-haiku-4.5 | **$55.40** |
| claude-sonnet-4.5 | $166.20 |
| claude-opus-4.1 | $831.00 |
| gpt-4o | $134.00 |
| qwen3-32b | $2.69 |
| gpt-oss-120b | $2.58 |

### Aggressive Estimate (Longer Conversations)
- Input: 5,500 tokens avg (4,500 prompt + 1,000 conversation)
- Output: 250 tokens avg
- **10K evaluations:**

| Model | Total Cost |
|-------|------------|
| claude-haiku-4.5 | **$67.50** |
| claude-sonnet-4.5 | $202.50 |
| claude-opus-4.1 | $1,012.50 |
| gpt-4o | $163.75 |
| qwen3-32b | $3.25 |
| gpt-oss-120b | $3.20 |

---

## Multi-Judge Mode (Optional)

If using `use_multiple_judges: true` (3 judges by default):
- **3x the LLM calls** = 3x the cost
- Higher accuracy but significantly more expensive

| Model | Cost (Single) | Cost (3 Judges) |
|-------|---------------|-----------------|
| claude-haiku-4.5 | $59.00 | **$177.00** |
| qwen3-32b | $2.85 | **$8.55** |
| gpt-4o | $142.50 | **$427.50** |

---

## Additional Costs (Optional Features)

### LLM-Generated Safe Replies
If using `assistant_safety_mode: 'llm_generate'` instead of template-based:
- **Additional LLM call per evaluation**
- Uses `claude-haiku-4.5` by default
- Input: ~5,000 tokens (system prompt + conversation + crisis resources)
- Output: ~150 tokens (safe reply text)

**Additional cost**: ~$59/month (doubles total cost)

**Recommendation**: Use template-based replies (default) for free tier to keep costs low.

---

## Recommended Configuration for Free Tier

```typescript
{
  // Single judge mode (default)
  useMultipleJudges: false,

  // Default: Ultra-efficient OSS model
  models: ['qwen/qwen3-32b'], // $2.85/month (DEFAULT)
  // OR models: ['anthropic/claude-haiku-4.5'], // $59/month (premium quality)

  // Template-based replies (default, no LLM cost)
  assistant_safety_mode: 'template',
}
```

### Cost Comparison:

| Configuration | Monthly Cost | Quality | Latency |
|---------------|--------------|---------|---------|
| **Qwen (single) [DEFAULT]** | **$2.85** | Very Good | Fast |
| **Haiku (single)** | **$59.00** | Excellent | Fast |
| **Haiku (3 judges)** | $177.00 | Best | Slower |
| **Sonnet (single)** | $177.00 | Excellent | Medium |

---

## Summary & Recommendations

### For Production Free Tier:

1. **Default Configuration (Ultra-Low Cost)**:
   - Model: `qwen3-32b`
   - Mode: Single judge
   - **Cost: ~$2.85/month**
   - Quality: Very good, reliable OSS model
   - **This is the default configuration**

2. **Premium Quality Upgrade**:
   - Model: `claude-haiku-4.5`
   - Mode: Single judge
   - **Cost: ~$59/month**
   - Quality: Excellent
   - Use if you need highest confidence scores

3. **Maximum Reliability (High-Stakes)**:
   - Model: `claude-haiku-4.5`
   - Mode: Multi-judge (3 judges)
   - **Cost: ~$177/month**
   - Quality: Best (consensus-based)
   - Use for regulated/high-stakes applications

### Break-Even Analysis

At current pricing, you can offer:
- **10,000 free evaluations/month at ~$59/month** = **$0.006 per evaluation**
- To break even with a $0.01/eval pricing, you'd need ~5,900 paid evals/month
- To break even with a $0.05/eval pricing, you'd need ~1,200 paid evals/month

### Scaling Costs

| Monthly Evaluations | Cost (Haiku) | Cost (Qwen) |
|---------------------|--------------|-------------|
| 10,000 (free tier) | $59 | $2.85 |
| 50,000 | $295 | $14.25 |
| 100,000 (pro tier) | $590 | $28.50 |
| 500,000 | $2,950 | $142.50 |
| 1,000,000 | $5,900 | $285.00 |

---

## Cost Optimization Strategies

1. **Use cheaper models for low/medium risk**:
   - Qwen for initial triage
   - Haiku/Sonnet for high/critical confirmation

2. **Prompt optimization**:
   - Current system prompt: ~4,500 tokens
   - Potential optimization: Could reduce to ~3,000 tokens
   - Savings: ~20% on input costs

3. **Caching (if provider supports)**:
   - System prompt rarely changes
   - Could cache prompt per session
   - Potential savings: ~90% on input costs after first call

4. **Conversation windowing**:
   - Limit to last 10 messages instead of full history
   - Reduces variable input tokens
   - Minimal quality impact for most cases

---

## Final Recommendation

**For the free tier (10,000 evals/month):**

Use **Qwen 3 32B** (default) in single-judge mode with template-based replies:
- **Monthly cost: ~$2.85**
- **Quality: Very good** (production-ready OSS model)
- **Latency: Fast** (~1-2s per evaluation)
- **Cost efficiency: Exceptional** (95% cheaper than premium models)

This provides excellent cost efficiency while maintaining production-quality mental health safety classification.

**Premium upgrade option** (if you need highest confidence):
- Use **Claude Haiku 4.5** for **~$59/month**
- Slightly better quality and confidence scores
- Consider upgrading if you're serving high-stakes applications or need maximum reliability
