/**
 * Tests for ProviderWithFallback
 *
 * Verifies timeout handling and automatic fallback logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderWithFallback, AllModelsFailed, DEFAULT_MODEL_TIMEOUT_MS } from '../../lib/providers/ProviderWithFallback';
import type { IProvider, ChatOptions, StreamChunk } from '../../lib/providers/IProvider';
import { MODEL_REGISTRY } from '../../lib/providers/ModelRegistry';

// Mock provider for testing
class MockProvider implements IProvider {
  public streamChatCalls: ChatOptions[] = [];

  constructor(
    private behavior: (options: ChatOptions) => AsyncGenerator<StreamChunk, void, unknown>
  ) {}

  async *streamChat(options: ChatOptions): AsyncGenerator<StreamChunk, void, unknown> {
    this.streamChatCalls.push(options);
    // Call behavior to get a fresh generator each time
    const generator = this.behavior(options);
    yield* generator;
  }
}

// Helper to create a successful stream
async function* successStream(content: string): AsyncGenerator<StreamChunk, void, unknown> {
  yield { type: 'content', content };
}

// Helper to create an error stream
async function* errorStream(message: string): AsyncGenerator<StreamChunk, void, unknown> {
  yield { type: 'error', error: message };
}

// Helper to create a timeout stream (never yields)
async function* timeoutStream(): AsyncGenerator<StreamChunk, void, unknown> {
  await new Promise(() => {}); // Never resolves
}

// Helper to create a slow stream (yields after delay)
async function* slowStream(delayMs: number, content: string): AsyncGenerator<StreamChunk, void, unknown> {
  await new Promise(resolve => setTimeout(resolve, delayMs));
  yield { type: 'content', content };
}

describe('ProviderWithFallback', () => {
  const models = MODEL_REGISTRY.slice(0, 3); // Use first 3 models for testing

  describe('constructor', () => {
    it('requires at least one model', () => {
      const mockProvider = new MockProvider(() => successStream('test'));

      expect(() => {
        new ProviderWithFallback(mockProvider, []);
      }).toThrow('ProviderWithFallback requires at least one model');
    });
  });

  describe('successful requests', () => {
    it('returns results from primary model on success', async () => {
      const mockProvider = new MockProvider(() => successStream('Hello from primary'));

      const provider = new ProviderWithFallback(mockProvider, models);

      const chunks: string[] = [];
      for await (const chunk of provider.streamChat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'test' }],
      })) {
        if (chunk.type === 'content') {
          chunks.push(chunk.content || '');
        }
      }

      expect(chunks.join('')).toBe('Hello from primary');
      expect(mockProvider.streamChatCalls).toHaveLength(1);
    });

    it('streams multiple chunks correctly', async () => {
      const mockProvider = new MockProvider(async function* () {
        yield { type: 'content', content: 'Hello ' };
        yield { type: 'content', content: 'world' };
        yield { type: 'content', content: '!' };
      });

      const provider = new ProviderWithFallback(mockProvider, models);

      const chunks: string[] = [];
      for await (const chunk of provider.streamChat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'test' }],
      })) {
        if (chunk.type === 'content') {
          chunks.push(chunk.content || '');
        }
      }

      expect(chunks).toEqual(['Hello ', 'world', '!']);
    });
  });

  describe('fallback on error', () => {
    it('falls back to next model on error', async () => {
      let callCount = 0;

      const mockProvider = new MockProvider(async function* (options) {
        callCount++;
        if (callCount === 1) {
          yield* errorStream('Primary model failed');
        } else {
          yield* successStream('Fallback success');
        }
      });

      const provider = new ProviderWithFallback(mockProvider, models);

      const chunks: string[] = [];
      for await (const chunk of provider.streamChat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'test' }],
      })) {
        if (chunk.type === 'content') {
          chunks.push(chunk.content || '');
        }
      }

      expect(chunks.join('')).toBe('Fallback success');
      expect(mockProvider.streamChatCalls).toHaveLength(2); // Primary + 1 fallback
    });

    it('tries all models before failing', async () => {
      const mockProvider = new MockProvider(() => errorStream('All models fail'));

      const provider = new ProviderWithFallback(mockProvider, models);

      await expect(async () => {
        for await (const chunk of provider.streamChat({
          model: 'test-model',
          messages: [{ role: 'user', content: 'test' }],
        })) {
          // Should not reach here
        }
      }).rejects.toThrow(AllModelsFailed);

      expect(mockProvider.streamChatCalls).toHaveLength(models.length); // All models tried
    });

    it('throws AllModelsFailed with attempt details', async () => {
      const mockProvider = new MockProvider(() => errorStream('Model error'));

      const provider = new ProviderWithFallback(mockProvider, models);

      try {
        for await (const chunk of provider.streamChat({
          model: 'test-model',
          messages: [{ role: 'user', content: 'test' }],
        })) {
          // Should not reach here
        }
        throw new Error('Should have thrown AllModelsFailed');
      } catch (error) {
        expect(error).toBeInstanceOf(AllModelsFailed);
        if (error instanceof AllModelsFailed) {
          expect(error.attempts).toHaveLength(models.length);
          expect(error.attempts[0].modelId).toBe(models[0].id);
          expect(error.message).toContain('All 3 models failed');
        }
      }
    });
  });

  describe('timeout handling', () => {
    it.skip('times out if model does not respond within timeout', async () => {
      // TODO: Fix this test - fake timers don't work well with async generators
      vi.useFakeTimers();

      try {
        const mockProvider = new MockProvider(() => timeoutStream());

        const provider = new ProviderWithFallback(mockProvider, models, 1000); // 1s timeout

        const streamPromise = (async () => {
          const chunks: string[] = [];
          for await (const chunk of provider.streamChat({
            model: 'test-model',
            messages: [{ role: 'user', content: 'test' }],
          })) {
            if (chunk.type === 'content') {
              chunks.push(chunk.content || '');
            }
          }
          return chunks;
        })();

        // Advance time past timeout
        await vi.advanceTimersByTimeAsync(1100);

        await expect(streamPromise).rejects.toThrow();

      } finally {
        vi.useRealTimers();
      }
    });

    it('does not timeout if chunks are streaming', async () => {
      const mockProvider = new MockProvider(async function* () {
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          yield { type: 'content', content: `chunk${i} ` };
        }
      });

      const provider = new ProviderWithFallback(mockProvider, models, 200); // 200ms timeout

      const chunks: string[] = [];
      for await (const chunk of provider.streamChat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'test' }],
      })) {
        if (chunk.type === 'content') {
          chunks.push(chunk.content || '');
        }
      }

      // Should succeed because chunks keep coming (timeout resets)
      expect(chunks.join('')).toBe('chunk0 chunk1 chunk2 chunk3 chunk4 ');
    });

    it.skip('falls back to next model on timeout', async () => {
      // TODO: Fix this test - fake timers don't work well with async generators
      vi.useFakeTimers();

      try {
        let callCount = 0;

        const mockProvider = new MockProvider(async function* () {
          callCount++;
          if (callCount === 1) {
            // First call: timeout (never yields)
            await new Promise(() => {});
          } else {
            // Second call: success
            yield { type: 'content', content: 'Fallback after timeout' };
          }
        });

        const provider = new ProviderWithFallback(mockProvider, models, 1000);

        const streamPromise = (async () => {
          const chunks: string[] = [];
          for await (const chunk of provider.streamChat({
            model: 'test-model',
            messages: [{ role: 'user', content: 'test' }],
          })) {
            if (chunk.type === 'content') {
              chunks.push(chunk.content || '');
            }
          }
          return chunks.join('');
        })();

        // Advance time to trigger timeout on first model
        await vi.advanceTimersByTimeAsync(1100);

        const result = await streamPromise;
        expect(result).toBe('Fallback after timeout');
        expect(mockProvider.streamChatCalls).toHaveLength(2);

      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('integration with model registry', () => {
    it('uses actual model specs from registry', () => {
      const mockProvider = new MockProvider(() => successStream('test'));

      const provider = new ProviderWithFallback(mockProvider, [
        MODEL_REGISTRY[0], // gpt-oss-20b
        MODEL_REGISTRY[1], // gpt-oss-120b
      ]);

      expect(provider).toBeDefined();
    });
  });

  describe('request options', () => {
    it('passes through all chat options to provider', async () => {
      const mockProvider = new MockProvider(() => successStream('test'));

      const provider = new ProviderWithFallback(mockProvider, models);

      const options: ChatOptions = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'hello' }],
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.7,
        maxTokens: 500,
      };

      for await (const chunk of provider.streamChat(options)) {
        // Consume stream
      }

      const lastCall = mockProvider.streamChatCalls[mockProvider.streamChatCalls.length - 1];
      expect(lastCall.systemPrompt).toBe(options.systemPrompt);
      expect(lastCall.temperature).toBe(options.temperature);
      expect(lastCall.maxTokens).toBe(options.maxTokens);
      expect(lastCall.messages).toEqual(options.messages);
    });

    it('overrides model with selected model ID', async () => {
      const mockProvider = new MockProvider(() => successStream('test'));

      const provider = new ProviderWithFallback(mockProvider, models);

      for await (const chunk of provider.streamChat({
        model: 'user-specified-model',
        messages: [{ role: 'user', content: 'test' }],
      })) {
        // Consume stream
      }

      const lastCall = mockProvider.streamChatCalls[mockProvider.streamChatCalls.length - 1];
      expect(lastCall.model).toBe(models[0].id); // Should be overridden with primary model
    });
  });
});
