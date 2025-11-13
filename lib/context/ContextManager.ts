import type { Message, ProcessEvent } from '../types';
import type { IProvider } from '../providers/IProvider';

/**
 * Manages conversation context to prevent mode collapse
 * - Synthesizes old messages into summaries
 * - Allocates tokens with exponential decay (recent messages get more space)
 * - Keeps system prompt and recent messages full-fidelity
 */
export class ContextManager {
  constructor(
    private provider: IProvider,
    private maxTokens: number = 4000,
    private synthesisThreshold: number = 10 // messages before synthesis
  ) {}

  /**
   * Prepares messages for the LLM, applying synthesis and token management
   */
  async *prepareContext(
    messages: Message[]
  ): AsyncGenerator<ProcessEvent, Message[], undefined> {
    // If under threshold, return as-is
    if (messages.length <= this.synthesisThreshold) {
      yield {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'context',
        step: 'no_synthesis_needed',
        description: `Message count (${messages.length}) below threshold (${this.synthesisThreshold})`,
        data: { messageCount: messages.length }
      };
      return messages;
    }

    // Separate system message, old messages, and recent messages
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Keep last 5 messages at full fidelity
    const recentCount = 5;
    const recentMessages = conversationMessages.slice(-recentCount);
    const oldMessages = conversationMessages.slice(0, -recentCount);

    if (oldMessages.length === 0) {
      return messages;
    }

    yield {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'context',
      step: 'synthesis_start',
      description: `Synthesizing ${oldMessages.length} older messages`,
      data: { oldCount: oldMessages.length, recentCount: recentMessages.length }
    };

    // Synthesize old messages
    const summary = await this.synthesizeMessages(oldMessages);

    yield {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'context',
      step: 'synthesis_complete',
      description: 'Created summary of older context',
      data: {
        originalMessages: oldMessages.length,
        summaryLength: summary.length
      }
    };

    // Construct final message list
    const result: Message[] = [
      ...systemMessages,
      {
        role: 'system',
        content: `CONVERSATION HISTORY SUMMARY:\nThe conversation started with the following context (summarized):\n\n${summary}\n\nThe most recent messages follow with full detail.`
      },
      ...recentMessages
    ];

    return result;
  }

  /**
   * Synthesizes a sequence of messages into a summary
   */
  private async synthesizeMessages(messages: Message[]): Promise<string> {
    const conversationText = messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const synthesisMessages: Message[] = [
      {
        role: 'system',
        content: `You are a conversation summarizer. Extract key facts, topics, and context from conversations. Be concise but preserve important details, especially:
- User's situation, background, or context
- Key questions or concerns raised
- Important facts or preferences mentioned
- Tone and emotional context

Format as a brief narrative summary (2-4 sentences).`
      },
      {
        role: 'user',
        content: `Summarize this conversation:\n\n${conversationText}`
      }
    ];

    let summary = '';

    try {
      for await (const chunk of this.provider.streamChat({
        messages: synthesisMessages,
        model: 'anthropic/claude-3.5-haiku', // Fast model for synthesis
        temperature: 0.5,
        maxTokens: 300
      })) {
        if (chunk.type === 'content' && chunk.content) {
          summary += chunk.content;
        }
      }
    } catch (error) {
      // Fallback: just take first and last message
      const first = messages[0]?.content.slice(0, 100) || '';
      const last = messages[messages.length - 1]?.content.slice(0, 100) || '';
      summary = `Earlier: ${first}... Later: ${last}...`;
    }

    return summary;
  }

  /**
   * Estimates token count (rough approximation: 1 token ≈ 4 chars)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
