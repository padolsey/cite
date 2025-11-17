/**
 * Test Logger
 *
 * Captures raw LLM payloads and responses during test runs
 * Saves to git-ignored test-logs/ directory for analysis
 *
 * Enable with: LOG_LLM_CALLS=true pnpm test:llm
 */

import { writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';

export interface LLMCallLog {
  timestamp: string;
  testContext?: string;
  model: string;
  request: {
    messages: any[];
    temperature?: number;
    max_tokens?: number;
    systemPrompt?: string;
  };
  response: {
    fullText: string;
    chunks?: any[];
    error?: string;
  };
  metadata: {
    duration_ms?: number;
    token_count?: number;
    finish_reason?: string;
  };
}

class TestLoggerSingleton {
  private enabled: boolean;
  private logDir: string;
  private sessionId: string;
  private sessionLogPath: string;
  private calls: LLMCallLog[] = [];
  private callCounter = 0;

  constructor() {
    // Check if logging is enabled
    this.enabled = process.env.LOG_LLM_CALLS === 'true' || process.env.DEBUG_LLM === 'true';

    // Create session ID (timestamp-based)
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // Set up log directory
    this.logDir = join(process.cwd(), 'test-logs', this.sessionId);
    this.sessionLogPath = join(this.logDir, 'session.jsonl');

    if (this.enabled) {
      this.initializeLogDirectory();
    }
  }

  private initializeLogDirectory(): void {
    try {
      if (!existsSync(this.logDir)) {
        mkdirSync(this.logDir, { recursive: true });
      }

      // Write session metadata
      const metadata = {
        session_id: this.sessionId,
        started_at: new Date().toISOString(),
        log_dir: this.logDir,
        node_version: process.version,
        env: {
          LOG_LLM_CALLS: process.env.LOG_LLM_CALLS,
          DEBUG_LLM: process.env.DEBUG_LLM,
        },
      };

      writeFileSync(
        join(this.logDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      console.log(`\n📝 LLM logging enabled → ${this.logDir}\n`);
    } catch (error) {
      console.warn('Failed to initialize test logger:', error);
      this.enabled = false;
    }
  }

  /**
   * Log a complete LLM call (request + response)
   */
  logCall(log: Omit<LLMCallLog, 'timestamp'>): void {
    if (!this.enabled) return;

    this.callCounter++;
    const callId = `call-${String(this.callCounter).padStart(4, '0')}`;

    const fullLog: LLMCallLog = {
      timestamp: new Date().toISOString(),
      ...log,
    };

    this.calls.push(fullLog);

    try {
      // Save individual call as separate file for easy inspection
      const callFilePath = join(this.logDir, `${callId}.json`);
      writeFileSync(callFilePath, JSON.stringify(fullLog, null, 2));

      // Also append to session JSONL for easy batch processing
      appendFileSync(
        this.sessionLogPath,
        JSON.stringify({ id: callId, ...fullLog }) + '\n'
      );
    } catch (error) {
      console.warn(`Failed to write log for ${callId}:`, error);
    }
  }

  /**
   * Log a request (called before LLM call)
   */
  logRequest(
    model: string,
    messages: any[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      systemPrompt?: string;
      testContext?: string;
    }
  ): number {
    if (!this.enabled) return -1;

    this.callCounter++;
    const callId = this.callCounter;

    const requestLog = {
      call_id: callId,
      timestamp: new Date().toISOString(),
      type: 'request',
      testContext: options?.testContext,
      model,
      request: {
        messages,
        temperature: options?.temperature,
        max_tokens: options?.max_tokens,
        systemPrompt: options?.systemPrompt,
      },
    };

    try {
      const requestPath = join(this.logDir, `call-${String(callId).padStart(4, '0')}-request.json`);
      writeFileSync(requestPath, JSON.stringify(requestLog, null, 2));
    } catch (error) {
      console.warn(`Failed to write request log for call ${callId}:`, error);
    }

    return callId;
  }

  /**
   * Log a response (called after LLM call completes)
   */
  logResponse(
    callId: number,
    response: {
      fullText: string;
      chunks?: any[];
      error?: string;
    },
    metadata?: {
      duration_ms?: number;
      token_count?: number;
      finish_reason?: string;
    }
  ): void {
    if (!this.enabled || callId === -1) return;

    const responseLog = {
      call_id: callId,
      timestamp: new Date().toISOString(),
      type: 'response',
      response,
      metadata,
    };

    try {
      const responsePath = join(
        this.logDir,
        `call-${String(callId).padStart(4, '0')}-response.json`
      );
      writeFileSync(responsePath, JSON.stringify(responseLog, null, 2));
    } catch (error) {
      console.warn(`Failed to write response log for call ${callId}:`, error);
    }
  }

  /**
   * Get all logged calls for current session
   */
  getCalls(): LLMCallLog[] {
    return this.calls;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get session log directory
   */
  getLogDir(): string {
    return this.logDir;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Finalize session (write summary)
   */
  finalize(): void {
    if (!this.enabled || this.calls.length === 0) return;

    try {
      const summary = {
        session_id: this.sessionId,
        total_calls: this.calls.length,
        completed_at: new Date().toISOString(),
        models_used: [...new Set(this.calls.map((c) => c.model))],
        total_duration_ms: this.calls.reduce(
          (sum, c) => sum + (c.metadata.duration_ms || 0),
          0
        ),
        errors: this.calls.filter((c) => c.response.error).length,
      };

      writeFileSync(
        join(this.logDir, 'summary.json'),
        JSON.stringify(summary, null, 2)
      );

      console.log(
        `\n📊 LLM logging summary: ${summary.total_calls} calls, ${summary.errors} errors`
      );
      console.log(`   Logs saved to: ${this.logDir}\n`);
    } catch (error) {
      console.warn('Failed to write summary:', error);
    }
  }
}

// Singleton instance
export const TestLogger = new TestLoggerSingleton();

// Finalize on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => TestLogger.finalize());
  process.on('SIGINT', () => {
    TestLogger.finalize();
    process.exit(0);
  });
}
