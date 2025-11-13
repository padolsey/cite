import type { Message, StreamChunk, ChatConfig } from '../types';

export interface ChatOptions extends ChatConfig {
  messages: Message[];
  onProcessEvent?: (event: any) => void;
}

export interface IProvider {
  /**
   * Streams a chat completion
   * Yields StreamChunk objects containing content, thinking, interceptions, etc.
   */
  streamChat(options: ChatOptions): AsyncGenerator<StreamChunk, void, undefined>;
}
