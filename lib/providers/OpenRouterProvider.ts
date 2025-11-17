import type { IProvider, ChatOptions, StreamChunk, Message } from './IProvider.js';
import { TestLogger } from '../utils/TestLogger.js';

/**
 * OpenRouter provider implementation
 * Uses OpenRouter's unified API for accessing multiple LLM providers
 */
export class OpenRouterProvider implements IProvider {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(apiKey?: string, apiUrl?: string) {
    // Safely check for process in browser vs Node.js
    const envApiKey = typeof process !== 'undefined' && process.env?.OPENROUTER_API_KEY;
    this.apiKey = apiKey || envApiKey || '';
    this.apiUrl = apiUrl || 'https://openrouter.ai/api/v1/chat/completions';

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is required');
    }
  }

  /**
   * Validate that a value can be safely JSON stringified
   * This catches Unicode surrogate pair issues before sending to API
   */
  private validateJsonSafe(value: any, context: string): void {
    try {
      const jsonStr = JSON.stringify(value);
      // Try to parse it back to ensure it's valid
      JSON.parse(jsonStr);
    } catch (e) {
      console.error(`❌ JSON validation failed for ${context}:`, e);
      console.error(`   Value preview:`, JSON.stringify(value).slice(0, 200));
      throw new Error(
        `Failed to encode ${context} as JSON: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  async *streamChat(options: ChatOptions): AsyncGenerator<StreamChunk, void, undefined> {
    const { model, messages, temperature = 0.7, maxTokens = 4096, systemPrompt } = options;

    // Build messages array with system prompt if provided
    const apiMessages: Message[] = [];
    if (systemPrompt) {
      apiMessages.push({ role: 'system', content: systemPrompt });
    }
    apiMessages.push(...messages);

    const requestBody = {
      model: model.replace('openrouter:', ''), // Strip provider prefix
      messages: apiMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    // Validate request body is JSON-safe before sending
    this.validateJsonSafe(requestBody, 'request body');

    // Log request if logging is enabled
    const startTime = Date.now();
    const callId = TestLogger.logRequest(model, apiMessages, {
      temperature,
      max_tokens: maxTokens,
      systemPrompt,
    });

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/cite-safety/cite',
          'X-Title': 'CITE Safety API',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        yield {
          type: 'error',
          error: `OpenRouter API error (${response.status}): ${errorText}`,
        };
        return;
      }

      if (!response.body) {
        yield {
          type: 'error',
          error: 'No response body from OpenRouter',
        };
        return;
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      const chunks: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              // Log chunks if enabled
              if (TestLogger.isEnabled()) {
                chunks.push(parsed);
              }

              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                fullText += content;
                yield {
                  type: 'content',
                  content,
                };
              }

              // Extract citations from annotations (for :online models)
              const annotations = parsed.choices?.[0]?.delta?.annotations;
              if (annotations && Array.isArray(annotations) && annotations.length > 0) {
                const citations = annotations
                  .filter((ann: any) => ann.type === 'url_citation')
                  .map((ann: any) => ({
                    title: ann.url_citation?.title || 'Untitled',
                    url: ann.url_citation?.url || '',
                  }))
                  .filter((cite: any) => cite.url); // Only include citations with valid URLs

                if (citations.length > 0) {
                  console.log(`[OpenRouter] Web search used - ${citations.length} citations found`);
                  yield { type: 'citations', citations };
                }
              }
            } catch (e) {
              // Skip malformed JSON
              continue;
            }
          }
        }
      }

      // Log successful response
      const duration = Date.now() - startTime;
      TestLogger.logResponse(
        callId,
        { fullText, chunks: TestLogger.isEnabled() ? chunks : undefined },
        { duration_ms: duration }
      );
    } catch (error) {
      // Log error response
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      TestLogger.logResponse(
        callId,
        { fullText: '', error: errorMessage },
        { duration_ms: duration }
      );

      yield {
        type: 'error',
        error: errorMessage,
      };
    }
  }
}
