import type { IProvider, ChatOptions } from './IProvider';
import type { StreamChunk, Message } from '../types';

export class OpenRouterProvider implements IProvider {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async *streamChat(options: ChatOptions): AsyncGenerator<StreamChunk, void, undefined> {
    const { messages, model, temperature = 0.7, maxTokens = 2000 } = options;

    // Format messages for OpenRouter API
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
          'X-Title': 'CITE Demo'
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        yield {
          type: 'error',
          error: `OpenRouter API error: ${response.status} - ${errorText}`
        };
        return;
      }

      if (!response.body) {
        yield {
          type: 'error',
          error: 'No response body from OpenRouter'
        };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                yield {
                  type: 'content',
                  content
                };
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
