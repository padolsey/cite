import type { IProvider, Message } from '../../providers/IProvider.js';

/**
 * Base class for all judges
 *
 * Implements the common pattern:
 * 1. Get system prompt (subclass-specific)
 * 2. Stream LLM response
 * 3. Parse response into structured output (subclass-specific)
 *
 * This abstraction allows us to easily add new judges
 * without duplicating the streaming/aggregation logic
 */
export abstract class BaseJudge<T> {
  constructor(
    protected provider: IProvider,
    protected model: string = 'anthropic/claude-haiku-4.5'
  ) {}

  /**
   * Get the system prompt for this judge
   * Subclasses must implement
   */
  protected abstract getSystemPrompt(): string;

  /**
   * Parse the LLM response into structured output
   * Subclasses must implement
   */
  protected abstract parseResponse(response: string): T;

  /**
   * Execute the judge
   * Streams response from LLM and parses into structured result
   */
  async judge(messages: Message[]): Promise<T> {
    // Get judge-specific prompt
    const systemPrompt = this.getSystemPrompt();

    // Stream LLM response
    const chunks: string[] = [];
    for await (const chunk of this.provider.streamChat({
      model: this.model,
      messages,
      systemPrompt,
      temperature: 0.1, // Low temp for consistency
      maxTokens: 1000,
    })) {
      if (chunk.type === 'content' && chunk.content) {
        chunks.push(chunk.content);
      } else if (chunk.type === 'error') {
        throw new Error(`LLM error: ${chunk.error}`);
      }
    }

    const response = chunks.join('');

    // Parse into structured result
    return this.parseResponse(response);
  }
}
