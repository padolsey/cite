/**
 * Provider interface for LLM API calls
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface Citation {
  title: string;
  url: string;
}

export interface StreamChunk {
  type: 'content' | 'error' | 'citations';
  content?: string;
  error?: string;
  citations?: Citation[];
  /** Optional trace ID for debugging (added by DebugProvider) */
  traceId?: string;
}

export interface IProvider {
  /**
   * Stream chat completion from the LLM
   * @param options Chat options including model, messages, etc.
   * @returns AsyncGenerator yielding content chunks
   */
  streamChat(options: ChatOptions): AsyncGenerator<StreamChunk, void, undefined>;
}
