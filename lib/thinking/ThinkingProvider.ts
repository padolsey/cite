import type { IProvider, ChatOptions } from '../providers/IProvider';
import type { StreamChunk, Message } from '../types';

/**
 * Decorator that adds thinking/CoT capabilities to any provider
 * - Injects thinking instructions into system prompt
 * - Intercepts and separates <thinking> blocks from visible content
 * - Emits thinking chunks separately for UI visibility
 */
export class ThinkingProvider implements IProvider {
  constructor(
    private wrapped: IProvider,
    private style: 'minimal' | 'detailed' = 'detailed'
  ) {}

  async *streamChat(options: ChatOptions): AsyncGenerator<StreamChunk, void, undefined> {
    const { onProcessEvent } = options;

    // Add thinking instructions to system prompt
    const modifiedMessages = this.injectThinkingPrompt(options.messages);

    onProcessEvent?.({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'thinking',
      step: 'inject_thinking_prompt',
      description: 'Added thinking instructions to system prompt',
      data: { style: this.style }
    });

    // Stream from wrapped provider
    let buffer = '';
    let inThinkingBlock = false;
    let thinkingContent = '';

    for await (const chunk of this.wrapped.streamChat({
      ...options,
      messages: modifiedMessages
    })) {
      // Pass through errors
      if (chunk.type === 'error') {
        yield chunk;
        continue;
      }

      // Process content for thinking blocks
      if (chunk.type === 'content' && chunk.content) {
        buffer += chunk.content;

        // Check for thinking block start
        if (buffer.includes('<thinking>')) {
          const parts = buffer.split('<thinking>');
          if (parts[0]) {
            yield { type: 'content', content: parts[0] };
          }
          buffer = parts[1] || '';
          inThinkingBlock = true;
        }

        // Check for thinking block end
        if (inThinkingBlock && buffer.includes('</thinking>')) {
          const parts = buffer.split('</thinking>');
          thinkingContent += parts[0];

          // Emit thinking chunk
          yield {
            type: 'thinking',
            thinking: thinkingContent
          };

          onProcessEvent?.({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: 'thinking',
            step: 'thinking_captured',
            description: 'Model completed internal thinking',
            data: { length: thinkingContent.length }
          });

          thinkingContent = '';
          buffer = parts[1] || '';
          inThinkingBlock = false;
        }

        // If not in thinking block, yield content
        if (!inThinkingBlock && buffer && !buffer.includes('<thinking>')) {
          yield { type: 'content', content: buffer };
          buffer = '';
        }
      }
    }

    // Flush any remaining buffer
    if (buffer && !inThinkingBlock) {
      yield { type: 'content', content: buffer };
    }
  }

  private injectThinkingPrompt(messages: Message[]): Message[] {
    const thinkingInstructions = this.style === 'detailed'
      ? `IMPORTANT: Before responding, think through your response carefully. Wrap your thinking in <thinking></thinking> tags. This thinking will not be shown to the user. Consider:
- What is the user really asking?
- Are there multiple interpretations?
- What are the risks or sensitivities in this conversation?
- What's the most helpful approach?

After your thinking, provide your response without the tags.`
      : `Before responding, briefly think through your answer in <thinking></thinking> tags (hidden from user).`;

    // Find or create system message
    const systemIndex = messages.findIndex(m => m.role === 'system');

    if (systemIndex >= 0) {
      const modified = [...messages];
      modified[systemIndex] = {
        ...modified[systemIndex],
        content: modified[systemIndex].content + '\n\n' + thinkingInstructions
      };
      return modified;
    } else {
      return [
        { role: 'system', content: thinkingInstructions },
        ...messages
      ];
    }
  }
}
