/**
 * Tests for AdaptiveModelPool
 *
 * Verifies AIMD (Additive Increase, Multiplicative Decrease) algorithm
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveModelPool, AIMD_CONFIG } from '../../lib/providers/AdaptiveModelPool';

describe('AdaptiveModelPool', () => {
  let pool: AdaptiveModelPool;

  beforeEach(() => {
    pool = new AdaptiveModelPool('test-model');
  });

  describe('basic execution', () => {
    it('executes requests immediately when under concurrency limit', async () => {
      const mockRequest = vi.fn(async () => 'result');

      const result = await pool.execute(mockRequest);

      expect(result).toBe('result');
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('queues requests when at concurrency limit', async () => {
      const requests: Array<() => Promise<string>> = [];
      const results: string[] = [];

      // Create 15 long-running requests (exceeds initial concurrency of 10)
      for (let i = 0; i < 15; i++) {
        requests.push(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return `result-${i}`;
        });
      }

      // Execute all requests concurrently
      const promises = requests.map(req => pool.execute(req).then(r => results.push(r)));

      // Wait for all to complete
      await Promise.all(promises);

      // All should complete successfully
      expect(results).toHaveLength(15);
    });

    it('propagates errors from requests', async () => {
      const mockRequest = async () => {
        throw new Error('Test error');
      };

      await expect(pool.execute(mockRequest)).rejects.toThrow('Test error');
    });
  });

  describe('AIMD - Additive Increase', () => {
    it('increases concurrency after SUCCESS_THRESHOLD successes', async () => {
      const mockRequest = vi.fn(async () => 'success');

      // Execute SUCCESS_THRESHOLD successful requests
      for (let i = 0; i < AIMD_CONFIG.SUCCESS_THRESHOLD; i++) {
        await pool.execute(mockRequest);
      }

      const stateBefore = pool.getState();
      expect(stateBefore.currentConcurrency).toBe(AIMD_CONFIG.INITIAL_CONCURRENCY);

      // One more success should trigger increase
      await pool.execute(mockRequest);

      const stateAfter = pool.getState();
      expect(stateAfter.currentConcurrency).toBe(AIMD_CONFIG.INITIAL_CONCURRENCY + 1);
      expect(stateAfter.totalSuccesses).toBe(AIMD_CONFIG.SUCCESS_THRESHOLD + 1);
    });

    it('does not exceed MAX_CONCURRENCY', async () => {
      const mockRequest = vi.fn(async () => 'success');

      // Execute many successful requests to reach max
      // Each increase requires SUCCESS_THRESHOLD + 1 requests (increase happens AFTER seeing threshold successes)
      const increasesNeeded = AIMD_CONFIG.MAX_CONCURRENCY - AIMD_CONFIG.INITIAL_CONCURRENCY;
      const requestsNeeded = increasesNeeded * (AIMD_CONFIG.SUCCESS_THRESHOLD + 1);

      for (let i = 0; i < requestsNeeded; i++) {
        await pool.execute(mockRequest);
      }

      const state = pool.getState();
      expect(state.currentConcurrency).toBe(AIMD_CONFIG.MAX_CONCURRENCY);

      // More successes should not increase further
      for (let i = 0; i < AIMD_CONFIG.SUCCESS_THRESHOLD; i++) {
        await pool.execute(mockRequest);
      }

      const stateAfter = pool.getState();
      expect(stateAfter.currentConcurrency).toBe(AIMD_CONFIG.MAX_CONCURRENCY);
    });
  });

  describe('AIMD - Multiplicative Decrease', () => {
    it('decreases concurrency on rate limit error', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      const initialConcurrency = pool.getState().currentConcurrency;

      await expect(pool.execute(async () => {
        throw rateLimitError;
      })).rejects.toThrow();

      const state = pool.getState();
      expect(state.currentConcurrency).toBe(Math.max(
        Math.floor(initialConcurrency * AIMD_CONFIG.DECREASE_FACTOR),
        AIMD_CONFIG.MIN_CONCURRENCY
      ));
      expect(state.totalRateLimits).toBe(1);
    });

    it('detects various rate limit error formats', async () => {
      const errors = [
        new Error('429 Too Many Requests'),
        new Error('Rate limit exceeded'),
        new Error('TOO MANY REQUESTS'),
      ];

      for (const error of errors) {
        const poolTest = new AdaptiveModelPool('test-rate-limit');
        const initialConcurrency = poolTest.getState().currentConcurrency;

        await expect(poolTest.execute(async () => {
          throw error;
        })).rejects.toThrow();

        const state = poolTest.getState();
        expect(state.currentConcurrency).toBeLessThan(initialConcurrency);
        expect(state.totalRateLimits).toBe(1);
      }
    });

    it('does not decrease below MIN_CONCURRENCY', async () => {
      const rateLimitError = new Error('Rate limit exceeded');

      // Trigger multiple rate limits
      for (let i = 0; i < 10; i++) {
        await expect(pool.execute(async () => {
          throw rateLimitError;
        })).rejects.toThrow();
      }

      const state = pool.getState();
      expect(state.currentConcurrency).toBeGreaterThanOrEqual(AIMD_CONFIG.MIN_CONCURRENCY);
    });

    it('respects cooldown period after decrease', async () => {
      const rateLimitError = new Error('429');

      // First rate limit
      await expect(pool.execute(async () => {
        throw rateLimitError;
      })).rejects.toThrow();

      const stateAfterFirst = pool.getState();
      const concurrencyAfterFirst = stateAfterFirst.currentConcurrency;
      expect(stateAfterFirst.isInCooldown).toBe(true);

      // Immediate second rate limit (should be ignored due to cooldown)
      await expect(pool.execute(async () => {
        throw rateLimitError;
      })).rejects.toThrow();

      const stateAfterSecond = pool.getState();
      expect(stateAfterSecond.currentConcurrency).toBe(concurrencyAfterFirst); // No change
      expect(stateAfterSecond.totalRateLimits).toBe(2); // Still tracked
    });

    it('resets success count on rate limit', async () => {
      const mockSuccess = vi.fn(async () => 'success');
      const rateLimitError = new Error('429');

      // Build up success count
      for (let i = 0; i < 5; i++) {
        await pool.execute(mockSuccess);
      }

      const stateBefore = pool.getState();
      expect(stateBefore.successCount).toBe(5);

      // Trigger rate limit
      await expect(pool.execute(async () => {
        throw rateLimitError;
      })).rejects.toThrow();

      const stateAfter = pool.getState();
      expect(stateAfter.successCount).toBe(0); // Reset
    });
  });

  describe('error handling', () => {
    it('resets success count on non-rate-limit errors', async () => {
      const mockSuccess = vi.fn(async () => 'success');
      const genericError = new Error('Network timeout');

      // Build up success count
      for (let i = 0; i < 5; i++) {
        await pool.execute(mockSuccess);
      }

      const stateBefore = pool.getState();
      expect(stateBefore.successCount).toBe(5);
      const concurrencyBefore = stateBefore.currentConcurrency;

      // Trigger generic error
      await expect(pool.execute(async () => {
        throw genericError;
      })).rejects.toThrow();

      const stateAfter = pool.getState();
      expect(stateAfter.successCount).toBe(0); // Reset
      expect(stateAfter.currentConcurrency).toBe(concurrencyBefore); // No change
      expect(stateAfter.totalErrors).toBe(1);
      expect(stateAfter.totalRateLimits).toBe(0); // Not a rate limit
    });
  });

  describe('state reporting', () => {
    it('provides accurate state information', async () => {
      const mockRequest = vi.fn(async () => 'success');

      await pool.execute(mockRequest);

      const state = pool.getState();

      expect(state.modelId).toBe('test-model');
      expect(state.currentConcurrency).toBe(AIMD_CONFIG.INITIAL_CONCURRENCY);
      expect(state.activeRequests).toBe(0); // Completed
      expect(state.queuedRequests).toBe(0);
      expect(state.totalSuccesses).toBe(1);
      expect(state.totalRateLimits).toBe(0);
      expect(state.totalErrors).toBe(0);
      expect(state.lastRequestTime).toBeGreaterThan(0);
    });

    it('tracks queued requests', async () => {
      // Create requests that will exceed concurrency limit
      const slowRequests = Array(15).fill(null).map(() =>
        pool.execute(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'done';
        })
      );

      // Check state while some are still queued
      await new Promise(resolve => setTimeout(resolve, 10));
      const state = pool.getState();

      expect(state.activeRequests).toBeGreaterThan(0);
      expect(state.activeRequests + state.queuedRequests).toBe(15);

      // Wait for all to complete
      await Promise.all(slowRequests);

      const finalState = pool.getState();
      expect(finalState.activeRequests).toBe(0);
      expect(finalState.queuedRequests).toBe(0);
    });
  });

  describe('idle timeout', () => {
    it('resets concurrency after idle timeout', async () => {
      // Mock timers
      vi.useFakeTimers();

      try {
        const mockRequest = vi.fn(async () => 'success');

        // Increase concurrency
        for (let i = 0; i < AIMD_CONFIG.SUCCESS_THRESHOLD + 1; i++) {
          await pool.execute(mockRequest);
        }

        const stateAfterIncrease = pool.getState();
        expect(stateAfterIncrease.currentConcurrency).toBe(AIMD_CONFIG.INITIAL_CONCURRENCY + 1);

        // Fast-forward past idle timeout
        vi.advanceTimersByTime(AIMD_CONFIG.IDLE_TIMEOUT_MS + 1000);

        // Next request should trigger reset
        await pool.execute(mockRequest);

        const stateAfterIdle = pool.getState();
        expect(stateAfterIdle.currentConcurrency).toBe(AIMD_CONFIG.INITIAL_CONCURRENCY);

      } finally {
        vi.useRealTimers();
      }
    });
  });
});
