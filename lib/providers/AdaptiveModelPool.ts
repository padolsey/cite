/**
 * AdaptiveModelPool
 *
 * Manages concurrency for each provider+model combination using AIMD
 * (Additive Increase, Multiplicative Decrease) algorithm.
 *
 * - Starts at 10 concurrent requests
 * - Increases to max 50 on sustained success
 * - Decreases aggressively on rate limits
 *
 * Each pool is per-model to isolate rate limits.
 */

/**
 * AIMD Algorithm Parameters
 */
export const AIMD_CONFIG = {
  /** Initial concurrency per model */
  INITIAL_CONCURRENCY: 10,

  /** Minimum concurrency (floor) */
  MIN_CONCURRENCY: 2,

  /** Maximum concurrency (ceiling) */
  MAX_CONCURRENCY: 50,

  /** Number of consecutive successes before increasing concurrency */
  SUCCESS_THRESHOLD: 10,

  /** Multiplicative decrease factor on rate limit (0.5 = cut in half) */
  DECREASE_FACTOR: 0.5,

  /** Minimum decrease amount to ensure progress */
  MIN_DECREASE: 1,

  /** Cooldown period (ms) after a decrease before allowing another decrease */
  DECREASE_COOLDOWN_MS: 5000,

  /** Idle timeout (ms) - reset to initial if no requests for this long */
  IDLE_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Pool state for observability
 */
export interface PoolState {
  modelId: string;
  currentConcurrency: number;
  activeRequests: number;
  queuedRequests: number;
  successCount: number;
  totalSuccesses: number;
  totalRateLimits: number;
  totalErrors: number;
  lastRateLimitTime: number | null;
  lastRequestTime: number;
  isInCooldown: boolean;
}

/**
 * Request in queue
 */
interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

/**
 * AdaptiveModelPool
 *
 * One pool per model, manages concurrency adaptively
 */
export class AdaptiveModelPool {
  private readonly modelId: string;

  // AIMD state
  private currentConcurrency: number = AIMD_CONFIG.INITIAL_CONCURRENCY;
  private successCount: number = 0;
  private totalSuccesses: number = 0;
  private totalRateLimits: number = 0;
  private totalErrors: number = 0;
  private lastRateLimitTime: number | null = null;
  private lastRequestTime: number = Date.now();

  // Queue management
  private activeRequests: number = 0;
  private queue: QueuedRequest<any>[] = [];

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  /**
   * Execute a request with adaptive concurrency control
   *
   * Queues the request if at concurrency limit, processes immediately otherwise
   */
  async execute<T>(request: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ execute: request, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process queued requests up to concurrency limit
   */
  private processQueue(): void {
    // Check for idle timeout
    this.checkIdleTimeout();

    const currentLimit = this.getCurrentConcurrency();

    while (this.activeRequests < currentLimit && this.queue.length > 0) {
      const queued = this.queue.shift();
      if (!queued) break;

      this.activeRequests++;
      this.executeRequest(queued);
    }
  }

  /**
   * Execute a single request and handle result
   */
  private async executeRequest<T>(queued: QueuedRequest<T>): Promise<void> {
    try {
      const result = await queued.execute();
      this.onSuccess();
      queued.resolve(result);
    } catch (error) {
      // Check if it's a rate limit error
      if (this.isRateLimitError(error)) {
        this.onRateLimit();
      } else {
        this.onError();
      }
      queued.reject(error as Error);
    } finally {
      this.activeRequests--;
      this.processQueue(); // Process next in queue
    }
  }

  /**
   * Check if error is a rate limit (429)
   */
  private isRateLimitError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('rate limit') ||
        message.includes('429') ||
        message.includes('too many requests')
      );
    }
    return false;
  }

  /**
   * Call this after a successful request
   * Gradually increases concurrency using additive increase
   */
  private onSuccess(): void {
    this.lastRequestTime = Date.now();
    this.totalSuccesses++;
    this.successCount++;

    // Additive increase: +1 after SUCCESS_THRESHOLD consecutive successes
    // Check > threshold (not >=) so we increase AFTER seeing N successes
    if (this.successCount > AIMD_CONFIG.SUCCESS_THRESHOLD) {
      if (this.currentConcurrency < AIMD_CONFIG.MAX_CONCURRENCY) {
        const oldConcurrency = this.currentConcurrency;
        this.currentConcurrency = Math.min(
          this.currentConcurrency + 1,
          AIMD_CONFIG.MAX_CONCURRENCY
        );

        console.info(
          `[AdaptiveModelPool][${this.modelId}] Increased concurrency ${oldConcurrency}→${this.currentConcurrency} ` +
          `(after ${AIMD_CONFIG.SUCCESS_THRESHOLD} successes)`
        );
      }

      this.successCount = 0; // Reset counter
    }
  }

  /**
   * Call this when a rate limit (429) is detected
   * Aggressively decreases concurrency using multiplicative decrease
   */
  private onRateLimit(): void {
    this.lastRequestTime = Date.now();
    this.totalRateLimits++;

    // Check cooldown to prevent multiple rapid decreases
    if (this.isInCooldown()) {
      console.warn(
        `[AdaptiveModelPool][${this.modelId}] Rate limit detected but in cooldown period. ` +
        `Concurrency remains at ${this.currentConcurrency}`
      );
      return;
    }

    // Multiplicative decrease
    const oldConcurrency = this.currentConcurrency;
    const decreased = Math.floor(this.currentConcurrency * AIMD_CONFIG.DECREASE_FACTOR);
    // Take the more aggressive decrease (smaller value) between multiplicative and minimum decrease
    const withMinDecrease = Math.min(
      decreased,
      this.currentConcurrency - AIMD_CONFIG.MIN_DECREASE
    );
    // But never go below MIN_CONCURRENCY floor
    this.currentConcurrency = Math.max(withMinDecrease, AIMD_CONFIG.MIN_CONCURRENCY);

    this.lastRateLimitTime = Date.now();
    this.successCount = 0; // Reset success counter

    console.warn(
      `[AdaptiveModelPool][${this.modelId}] Rate limit detected! ` +
      `Decreased concurrency ${oldConcurrency}→${this.currentConcurrency} (×${AIMD_CONFIG.DECREASE_FACTOR})`
    );
  }

  /**
   * Call this when any non-rate-limit error occurs
   * Resets success counter but doesn't change concurrency
   */
  private onError(): void {
    this.lastRequestTime = Date.now();
    this.totalErrors++;
    this.successCount = 0; // Reset success counter
  }

  /**
   * Get the current concurrency limit
   */
  private getCurrentConcurrency(): number {
    return this.currentConcurrency;
  }

  /**
   * Check if we're in a cooldown period after a rate limit
   */
  private isInCooldown(): boolean {
    if (this.lastRateLimitTime === null) {
      return false;
    }

    const timeSinceLastDecrease = Date.now() - this.lastRateLimitTime;
    return timeSinceLastDecrease < AIMD_CONFIG.DECREASE_COOLDOWN_MS;
  }

  /**
   * Check for idle timeout and reset if needed
   */
  private checkIdleTimeout(): void {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (
      timeSinceLastRequest > AIMD_CONFIG.IDLE_TIMEOUT_MS &&
      this.currentConcurrency !== AIMD_CONFIG.INITIAL_CONCURRENCY
    ) {
      console.info(
        `[AdaptiveModelPool][${this.modelId}] Idle timeout (${timeSinceLastRequest}ms). ` +
        `Resetting concurrency ${this.currentConcurrency}→${AIMD_CONFIG.INITIAL_CONCURRENCY}`
      );
      this.currentConcurrency = AIMD_CONFIG.INITIAL_CONCURRENCY;
      this.successCount = 0;
      this.lastRateLimitTime = null;
    }
  }

  /**
   * Get current state for monitoring/debugging
   */
  getState(): PoolState {
    return {
      modelId: this.modelId,
      currentConcurrency: this.getCurrentConcurrency(),
      activeRequests: this.activeRequests,
      queuedRequests: this.queue.length,
      successCount: this.successCount,
      totalSuccesses: this.totalSuccesses,
      totalRateLimits: this.totalRateLimits,
      totalErrors: this.totalErrors,
      lastRateLimitTime: this.lastRateLimitTime,
      lastRequestTime: this.lastRequestTime,
      isInCooldown: this.isInCooldown(),
    };
  }
}

/**
 * Global pool manager - one pool per model
 */
class PoolManager {
  private pools: Map<string, AdaptiveModelPool> = new Map();

  getPool(modelId: string): AdaptiveModelPool {
    if (!this.pools.has(modelId)) {
      this.pools.set(modelId, new AdaptiveModelPool(modelId));
    }
    return this.pools.get(modelId)!;
  }

  getAllStates(): PoolState[] {
    return Array.from(this.pools.values()).map((pool) => pool.getState());
  }
}

// Singleton instance
export const poolManager = new PoolManager();
