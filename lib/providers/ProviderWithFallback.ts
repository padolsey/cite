/**
 * ProviderWithFallback
 *
 * Wraps IProvider to add:
 * - Timeout handling (default 10s)
 * - Automatic fallback to next model on failure/timeout
 * - Integration with AdaptiveModelPool for concurrency management
 *
 * Usage:
 * 1. Select models using ModelSelector
 * 2. Create ProviderWithFallback with primary + fallbacks
 * 3. Call streamChat() - will automatically try fallbacks on failure
 */

import type { IProvider, Message, StreamChunk, ChatOptions } from './IProvider.js';
import type { ModelSpec } from './ModelRegistry.js';
import { poolManager } from './AdaptiveModelPool.js';

/**
 * Timeout for each model attempt (milliseconds)
 */
export const DEFAULT_MODEL_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * Error thrown when all models fail
 */
export class AllModelsFailed extends Error {
  constructor(
    public attempts: Array<{ modelId: string; error: Error }>,
    message: string
  ) {
    super(message);
    this.name = 'AllModelsFailed';
  }
}

/**
 * ProviderWithFallback
 *
 * Automatically retries with fallback models on failure or timeout
 */
export class ProviderWithFallback implements IProvider {
  private readonly baseProvider: IProvider;
  private readonly models: ModelSpec[];
  private readonly timeoutMs: number;

  /**
   * Create a provider with fallback support
   *
   * @param baseProvider - Underlying provider (e.g., OpenRouterProvider)
   * @param models - Models to try in order [primary, fallback1, fallback2, ...]
   * @param timeoutMs - Timeout per model attempt (default 10s)
   */
  constructor(
    baseProvider: IProvider,
    models: ModelSpec[],
    timeoutMs: number = DEFAULT_MODEL_TIMEOUT_MS
  ) {
    if (models.length === 0) {
      throw new Error('ProviderWithFallback requires at least one model');
    }

    this.baseProvider = baseProvider;
    this.models = models;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Stream chat with automatic fallback
   *
   * Tries each model in sequence until one succeeds or all fail
   */
  async *streamChat(options: ChatOptions): AsyncGenerator<StreamChunk, void, unknown> {
    const attempts: Array<{ modelId: string; error: Error }> = [];

    for (let i = 0; i < this.models.length; i++) {
      const model = this.models[i];
      const isLastModel = i === this.models.length - 1;

      try {
        console.info(
          `[ProviderWithFallback] Attempting ${model.id} (${i + 1}/${this.models.length})` +
          (i > 0 ? ` [FALLBACK]` : '')
        );

        // Get pool for this model
        const pool = poolManager.getPool(model.id);

        // Execute within pool's concurrency limit
        const streamGenerator = await pool.execute(async () => {
          return this.streamChatWithTimeout(model.id, options, this.timeoutMs);
        });

        // Stream results
        yield* streamGenerator;

        // Success - log and return
        console.info(`[ProviderWithFallback] ✅ ${model.id} succeeded`);
        return;

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        attempts.push({ modelId: model.id, error: err });

        console.warn(
          `[ProviderWithFallback] ❌ ${model.id} failed: ${err.message}` +
          (isLastModel ? ' (last model)' : '')
        );

        // If not the last model, continue to next fallback
        if (!isLastModel) {
          console.info(`[ProviderWithFallback] Trying next fallback...`);
          continue;
        }

        // All models failed
        throw new AllModelsFailed(
          attempts,
          `All ${this.models.length} models failed. Attempts: ${attempts
            .map((a) => `${a.modelId}: ${a.error.message}`)
            .join('; ')}`
        );
      }
    }
  }

  /**
   * Stream chat with timeout
   *
   * Returns a generator that throws TimeoutError if model doesn't respond in time
   */
  private async streamChatWithTimeout(
    modelId: string,
    options: ChatOptions,
    timeoutMs: number
  ): Promise<AsyncGenerator<StreamChunk, void, unknown>> {
    // Start streaming
    const stream = this.baseProvider.streamChat({
      ...options,
      model: modelId, // Override model
    });

    // Wrap with timeout logic
    return this.wrapStreamWithTimeout(stream, timeoutMs, modelId);
  }

  /**
   * Wrap an async generator with timeout
   *
   * Throws TimeoutError if no chunks received within timeoutMs
   */
  private async *wrapStreamWithTimeout(
    stream: AsyncGenerator<StreamChunk, void, unknown>,
    timeoutMs: number,
    modelId: string
  ): AsyncGenerator<StreamChunk, void, unknown> {
    let timeoutHandle: NodeJS.Timeout | null = null;
    let timedOut = false;

    const createTimeout = () => {
      return setTimeout(() => {
        timedOut = true;
      }, timeoutMs);
    };

    try {
      timeoutHandle = createTimeout();

      for await (const chunk of stream) {
        // Check if timed out
        if (timedOut) {
          throw new Error(`Timeout after ${timeoutMs}ms for model ${modelId}`);
        }

        // Check for error chunks
        if (chunk.type === 'error') {
          throw new Error(chunk.error || 'Unknown error from provider');
        }

        // Reset timeout on each chunk (streaming is active)
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        timeoutHandle = createTimeout();

        yield chunk;
      }

      // Clear final timeout
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

    } catch (error) {
      // Clear timeout on error
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (timedOut) {
        throw new Error(`Timeout after ${timeoutMs}ms for model ${modelId}`);
      }

      throw error;
    }
  }
}
