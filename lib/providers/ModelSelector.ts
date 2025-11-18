/**
 * ModelSelector
 *
 * Selects the cheapest viable model(s) for a given task based on:
 * - Input token requirements
 * - Required capabilities
 * - Cost optimization
 *
 * Returns models in priority order (cheapest viable first, with fallbacks)
 */

import type { ModelSpec, ModelCapabilities } from './ModelRegistry.js';
import { MODEL_REGISTRY, estimateTokens } from './ModelRegistry.js';

/**
 * Task constraints
 */
export interface TaskConstraints {
  /** Estimated input tokens needed (optional - will estimate from text if not provided) */
  estimatedInputTokens?: number;

  /** Input text to estimate tokens from (if estimatedInputTokens not provided) */
  inputText?: string;

  /** Required capabilities */
  requiredCapabilities: Partial<ModelCapabilities>;

  /** Maximum latency tolerance in seconds (optional) */
  maxLatencySeconds?: number;
}

/**
 * Model selection result
 */
export interface ModelSelectionResult {
  /** Primary model (cheapest viable) */
  primary: ModelSpec;

  /** Fallback models (in priority order) */
  fallbacks: ModelSpec[];

  /** Reason for selection */
  reason: string;
}

/**
 * ModelSelector
 */
export class ModelSelector {
  /**
   * Select the best model(s) for a task
   *
   * Returns primary model + fallbacks in priority order
   */
  static selectModels(constraints: TaskConstraints): ModelSelectionResult {
    // 1. Estimate input tokens if needed
    const inputTokens = constraints.estimatedInputTokens ??
      (constraints.inputText ? estimateTokens(constraints.inputText) : 0);

    // 2. Filter viable models
    const viableModels = MODEL_REGISTRY.filter((model) => {
      // Check context length
      if (inputTokens > model.maxInputTokens) {
        return false;
      }

      // Check capabilities
      for (const [capability, required] of Object.entries(constraints.requiredCapabilities)) {
        if (required && !model.capabilities[capability as keyof ModelCapabilities]) {
          return false;
        }
      }

      // Check latency (optional constraint)
      if (constraints.maxLatencySeconds !== undefined) {
        if (model.latencyRange[1] > constraints.maxLatencySeconds) {
          return false;
        }
      }

      return true;
    });

    if (viableModels.length === 0) {
      throw new Error(
        `No viable models found for constraints: ${JSON.stringify({
          inputTokens,
          requiredCapabilities: constraints.requiredCapabilities,
          maxLatency: constraints.maxLatencySeconds,
        })}`
      );
    }

    // 3. Sort by cost (cheapest first)
    const sortedModels = [...viableModels].sort(
      (a, b) => a.inputPricePer1M - b.inputPricePer1M
    );

    // 4. Return primary + fallbacks
    const [primary, ...fallbacks] = sortedModels;

    const reason = `Selected ${primary.id} (cost: $${primary.inputPricePer1M}/$${primary.outputPricePer1M} per 1M tokens, ` +
      `context: ${primary.maxInputTokens.toLocaleString()}, ` +
      `latency: ${primary.latencyRange[0]}-${primary.latencyRange[1]}s). ` +
      `Input tokens: ${inputTokens.toLocaleString()}. ` +
      `Fallbacks: ${fallbacks.length > 0 ? fallbacks.map(m => m.id).join(', ') : 'none'}.`;

    return {
      primary,
      fallbacks,
      reason,
    };
  }

  /**
   * Get all models that support a specific capability, sorted by cost
   */
  static getModelsWithCapability(capability: keyof ModelCapabilities): ModelSpec[] {
    return MODEL_REGISTRY
      .filter((model) => model.capabilities[capability])
      .sort((a, b) => a.inputPricePer1M - b.inputPricePer1M);
  }

  /**
   * Get the cheapest model that supports all required capabilities
   */
  static getCheapestForCapabilities(
    requiredCapabilities: Partial<ModelCapabilities>
  ): ModelSpec | null {
    const result = this.selectModels({
      requiredCapabilities,
      estimatedInputTokens: 0, // No context constraint
    });

    return result.primary;
  }
}
