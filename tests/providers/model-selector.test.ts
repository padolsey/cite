/**
 * Tests for ModelSelector
 *
 * Verifies that the cheapest viable model is selected based on constraints
 */

import { describe, it, expect } from 'vitest';
import { ModelSelector } from '../../lib/providers/ModelSelector';
import { estimateTokens } from '../../lib/providers/ModelRegistry';

describe('ModelSelector', () => {
  describe('selectModels', () => {
    it('selects cheapest model for small inputs', () => {
      const result = ModelSelector.selectModels({
        inputText: 'Hello, I am feeling sad today.',
        requiredCapabilities: { riskClassification: true },
      });

      // Should select gpt-oss-20b (cheapest at $0.03/$0.14)
      expect(result.primary.id).toBe('openai/gpt-oss-20b');
      expect(result.fallbacks.length).toBeGreaterThan(0);
    });

    it('excludes models that cannot fit input', () => {
      // Create a very large input that exceeds qwen3-32b's 40k token limit
      const largeInput = 'test '.repeat(25000); // ~125k tokens (chars/3 = 500k/3 ≈ 166k)
      const estimatedTokens = estimateTokens(largeInput);

      const result = ModelSelector.selectModels({
        inputText: largeInput,
        requiredCapabilities: { riskClassification: true },
      });

      // Should NOT select qwen3-32b (only 40k context)
      expect(result.primary.id).not.toBe('qwen/qwen3-32b');

      // Should select a model with larger context
      expect(result.primary.maxInputTokens).toBeGreaterThan(estimatedTokens);
    });

    it('respects capability constraints for safe reply generation', () => {
      const result = ModelSelector.selectModels({
        inputText: 'Short message',
        requiredCapabilities: { safeReplyGeneration: true },
      });

      // Should NOT select gpt-oss-20b (not trusted for safe replies)
      expect(result.primary.id).not.toBe('openai/gpt-oss-20b');

      // Should select gpt-oss-120b (trusted, cheapest viable at $0.04/$0.40)
      expect(result.primary.id).toBe('openai/gpt-oss-120b');
      expect(result.primary.capabilities.safeReplyGeneration).toBe(true);
    });

    it('returns fallbacks in price order', () => {
      const result = ModelSelector.selectModels({
        inputText: 'Test message',
        requiredCapabilities: { riskClassification: true },
      });

      // Verify fallbacks are sorted by price
      for (let i = 0; i < result.fallbacks.length - 1; i++) {
        const current = result.fallbacks[i];
        const next = result.fallbacks[i + 1];
        expect(current.inputPricePer1M).toBeLessThanOrEqual(next.inputPricePer1M);
      }
    });

    it('throws error when no models can satisfy constraints', () => {
      expect(() => {
        ModelSelector.selectModels({
          estimatedInputTokens: 2_000_000, // Exceeds all models
          requiredCapabilities: { riskClassification: true },
        });
      }).toThrow('No viable models found');
    });
  });

  describe('getModelsWithCapability', () => {
    it('returns all models with risk classification capability', () => {
      const models = ModelSelector.getModelsWithCapability('riskClassification');

      // All models in registry support risk classification
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.capabilities.riskClassification)).toBe(true);
    });

    it('filters models for safe reply generation', () => {
      const models = ModelSelector.getModelsWithCapability('safeReplyGeneration');

      // Should include trusted models, exclude gpt-oss-20b
      const modelIds = models.map(m => m.id);
      expect(modelIds).not.toContain('openai/gpt-oss-20b');
      expect(modelIds).toContain('openai/gpt-oss-120b');
      expect(modelIds).toContain('qwen/qwen3-32b');
      expect(modelIds).toContain('anthropic/claude-haiku-4.5');
    });

    it('returns models sorted by price', () => {
      const models = ModelSelector.getModelsWithCapability('safeReplyGeneration');

      for (let i = 0; i < models.length - 1; i++) {
        expect(models[i].inputPricePer1M).toBeLessThanOrEqual(models[i + 1].inputPricePer1M);
      }
    });
  });

  describe('estimateTokens', () => {
    it('estimates tokens conservatively (chars / 3)', () => {
      const text = 'Hello world'; // 11 chars
      const tokens = estimateTokens(text);

      expect(tokens).toBe(Math.ceil(11 / 3)); // 4 tokens
    });

    it('handles empty strings', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('handles large texts', () => {
      const largeText = 'a'.repeat(120000); // 120k chars
      const tokens = estimateTokens(largeText);

      expect(tokens).toBe(40000); // 120k / 3 = 40k tokens
    });
  });
});
