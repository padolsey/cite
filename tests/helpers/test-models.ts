/**
 * Multi-Model Test Configuration
 *
 * Supports running LLM tests against multiple models via TEST_MODELS env var
 *
 * Usage:
 *   pnpm test:llm                                    # Default: haiku only
 *   TEST_MODELS=haiku,gpt-oss-120b pnpm test:llm    # Multiple models
 *   TEST_MODELS=all pnpm test:llm                    # All models
 */

export interface TestModel {
  id: string;
  name: string;
  description: string;
}

/**
 * Available models for testing
 */
export const AVAILABLE_MODELS: TestModel[] = [
  {
    id: 'qwen/qwen3-32b',
    name: 'Qwen3 32B',
    description: 'Default model - ultra-cheap, reliable OSS model',
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    name: 'Haiku 4.5',
    description: 'Premium model - fast, excellent quality',
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B',
    description: 'OpenAI OSS model',
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT OSS 20B',
    description: 'OpenAI OSS 20B model',
  },
];

/**
 * Get models to test based on TEST_MODELS env var
 *
 * Examples:
 *   TEST_MODELS=haiku                           -> [haiku]
 *   TEST_MODELS=haiku,gpt-oss-120b              -> [haiku, gpt-oss-120b]
 *   TEST_MODELS=all                             -> all models
 *   (not set)                                   -> [haiku] (default)
 */
export function getTestModels(): TestModel[] {
  const envModels = process.env.TEST_MODELS?.trim();

  // No env var: default to haiku
  if (!envModels) {
    return [AVAILABLE_MODELS[0]];
  }

  // "all" special case
  if (envModels.toLowerCase() === 'all') {
    return AVAILABLE_MODELS;
  }

  // Parse comma-separated list
  const requestedIds = envModels.split(',').map(s => s.trim());
  const models: TestModel[] = [];

  for (const requestedId of requestedIds) {
    // Support short aliases (haiku, gpt-oss-120b, qwen3-32b)
    const model = AVAILABLE_MODELS.find(
      m =>
        m.id === requestedId ||
        m.id.includes(requestedId) ||
        m.name.toLowerCase().includes(requestedId.toLowerCase())
    );

    if (model) {
      models.push(model);
    } else {
      console.warn(`⚠️  Unknown model "${requestedId}" in TEST_MODELS - skipping`);
    }
  }

  // Fallback to default if no valid models found
  if (models.length === 0) {
    console.warn('⚠️  No valid models found in TEST_MODELS, using default (haiku)');
    return [AVAILABLE_MODELS[0]];
  }

  return models;
}

/**
 * Get a readable test description suffix for vitest
 */
export function getModelTestSuffix(model: TestModel): string {
  return `[${model.name}]`;
}

/**
 * Log which models are being tested (call in beforeAll)
 */
export function logTestModels(models: TestModel[]): void {
  console.log('\n🧪 Testing with models:');
  for (const model of models) {
    console.log(`   - ${model.name}: ${model.id}`);
  }
  console.log('');
}
