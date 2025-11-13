import type { ProcessEvent } from '../types';

/**
 * Tool result with structured knowledge
 */
export interface ToolResult {
  success: boolean;
  knowledge?: string;  // Formatted as <RELEVANT_KNOWLEDGE>...</RELEVANT_KNOWLEDGE>
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Tool interface - all specialist tools implement this
 * Tools are specialists that:
 * - Take a specific query/input
 * - Process it (often with LLM calls or external APIs)
 * - Return structured knowledge
 * - Yield process events for observability
 */
export interface ITool {
  name: string;
  description: string;

  /**
   * Execute the tool with given input
   * Yields ProcessEvents for observability
   * Returns ToolResult with knowledge or error
   */
  execute(input: string): AsyncGenerator<ProcessEvent, ToolResult, undefined>;
}
