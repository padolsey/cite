/**
 * ModelRegistry
 *
 * Central registry of all available models with their constraints and capabilities.
 * Used by ModelSelector to choose the cheapest viable model for each task.
 */

/**
 * Model capabilities (heuristically determined)
 */
export interface ModelCapabilities {
  /** Can perform risk classification */
  riskClassification: boolean;

  /** Can generate safe replies (requires higher trust/quality) */
  safeReplyGeneration: boolean;

  /** Can perform language detection */
  languageDetection: boolean;
}

/**
 * Model specification
 */
export interface ModelSpec {
  /** Full model identifier (e.g., 'qwen/qwen3-32b') */
  id: string;

  /** Provider (currently all 'openrouter') */
  provider: 'openrouter';

  /** Input context limit in tokens */
  maxInputTokens: number;

  /** Pricing per 1M input tokens (USD) */
  inputPricePer1M: number;

  /** Pricing per 1M output tokens (USD) */
  outputPricePer1M: number;

  /** Typical latency range in seconds [min, max] */
  latencyRange: [number, number];

  /** Model capabilities */
  capabilities: ModelCapabilities;

  /** Human-readable name */
  name: string;
}

/**
 * All available models, sorted by cost (cheapest first)
 */
export const MODEL_REGISTRY: ModelSpec[] = [
  {
    id: 'openai/gpt-oss-20b',
    provider: 'openrouter',
    name: 'GPT OSS 20B',
    maxInputTokens: 130_000,
    inputPricePer1M: 0.03,
    outputPricePer1M: 0.14,
    latencyRange: [0.3, 1.0],
    capabilities: {
      riskClassification: true,
      safeReplyGeneration: false, // Explicitly NOT trusted for safe replies
      languageDetection: true,
    },
  },
  {
    id: 'openai/gpt-oss-120b',
    provider: 'openrouter',
    name: 'GPT OSS 120B',
    maxInputTokens: 130_000,
    inputPricePer1M: 0.04,
    outputPricePer1M: 0.40,
    latencyRange: [0.5, 1.2],
    capabilities: {
      riskClassification: true,
      safeReplyGeneration: true, // ✅ Trusted
      languageDetection: true,
    },
  },
  {
    id: 'qwen/qwen3-32b',
    provider: 'openrouter',
    name: 'Qwen3 32B',
    maxInputTokens: 40_000,
    inputPricePer1M: 0.05,
    outputPricePer1M: 0.20,
    latencyRange: [1.0, 2.0],
    capabilities: {
      riskClassification: true,
      safeReplyGeneration: true, // ✅ Trusted
      languageDetection: true,
    },
  },
  {
    id: 'qwen/qwen3-30b-a3b-instruct-2507',
    provider: 'openrouter',
    name: 'Qwen3 30B A3B',
    maxInputTokens: 262_000,
    inputPricePer1M: 0.08,
    outputPricePer1M: 0.33,
    latencyRange: [0.9, 2.0],
    capabilities: {
      riskClassification: true,
      safeReplyGeneration: true, // ✅ Trusted
      languageDetection: true,
    },
  },
  {
    id: 'google/gemini-2.5-flash',
    provider: 'openrouter',
    name: 'Gemini 2.5 Flash',
    maxInputTokens: 1_000_000,
    inputPricePer1M: 0.30,
    outputPricePer1M: 2.50,
    latencyRange: [0.6, 1.4],
    capabilities: {
      riskClassification: true,
      safeReplyGeneration: true, // ✅ Trusted
      languageDetection: true,
    },
  },
  {
    id: 'moonshotai/kimi-k2-0905',
    provider: 'openrouter',
    name: 'Kimi K2',
    maxInputTokens: 260_000,
    inputPricePer1M: 0.39,
    outputPricePer1M: 1.90,
    latencyRange: [0.7, 2.0],
    capabilities: {
      riskClassification: true,
      safeReplyGeneration: true, // ✅ Trusted (assuming quality)
      languageDetection: true,
    },
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    provider: 'openrouter',
    name: 'Claude Haiku 4.5',
    maxInputTokens: 200_000,
    inputPricePer1M: 1.00,
    outputPricePer1M: 5.00,
    latencyRange: [0.7, 1.5],
    capabilities: {
      riskClassification: true,
      safeReplyGeneration: true, // ✅ Trusted
      languageDetection: true,
    },
  },
];

/**
 * Get model by ID
 */
export function getModelById(modelId: string): ModelSpec | undefined {
  return MODEL_REGISTRY.find((m) => m.id === modelId);
}

/**
 * Get all models sorted by input price (cheapest first)
 */
export function getModelsSortedByPrice(): ModelSpec[] {
  return [...MODEL_REGISTRY].sort((a, b) => a.inputPricePer1M - b.inputPricePer1M);
}

/**
 * Estimate input tokens from text (conservative: chars / 3)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}
