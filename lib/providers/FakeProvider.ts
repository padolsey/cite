import type { IProvider, ChatOptions, StreamChunk } from './IProvider.js';

/**
 * Fake provider for testing
 * Returns predefined responses based on input messages
 * Enables fast unit tests without LLM API calls
 */
export class FakeProvider implements IProvider {
  constructor(
    private mockResponses: Map<string, string> = new Map(),
    private defaultResponse: string = '<language>en</language><reflection>Default response</reflection><classification>CLASS_NONE</classification>'
  ) {}

  async *streamChat(options: ChatOptions): AsyncGenerator<StreamChunk, void, undefined> {
    // Create a key from messages to look up response
    const key = JSON.stringify(options.messages);
    const response = this.mockResponses.get(key) || this.defaultResponse;

    // Simulate streaming by yielding the response in chunks
    const chunkSize = 10;
    for (let i = 0; i < response.length; i += chunkSize) {
      yield {
        type: 'content',
        content: response.slice(i, i + chunkSize),
      };
      // Small delay to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  /**
   * Helper to add a mock response for specific input
   */
  addMockResponse(messages: string, response: string): void {
    this.mockResponses.set(messages, response);
  }

  /**
   * Helper to clear all mock responses
   */
  clearMockResponses(): void {
    this.mockResponses.clear();
  }
}
