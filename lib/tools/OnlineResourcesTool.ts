import type { ITool, ToolResult } from './ITool';
import type { ProcessEvent, Message } from '../types';
import type { IProvider } from '../providers/IProvider';

/**
 * Tool for fetching up-to-date online resources
 * Uses gpt-4.1-mini:online to search the web for current information
 *
 * Common use cases:
 * - Crisis hotline numbers (updated contact info)
 * - Mental health resources by region
 * - Verified safety information
 */
export class OnlineResourcesTool implements ITool {
  name = 'getOnlineResources';
  description = 'Fetches up-to-date resources from the web using online-capable model';

  constructor(private provider: IProvider) {}

  async *execute(input: string): AsyncGenerator<ProcessEvent, ToolResult, undefined> {
    const startTime = Date.now();

    yield {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'interception',  // Tools are part of the interception layer
      step: 'tool_call_start',
      description: `Calling tool: ${this.name}`,
      data: { toolName: this.name, input }
    };

    // Build query for online model
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are a middleware service that retrieves factual information for another AI system.

Your output will be inserted as structured data into another LLM's context - it is NOT for direct human reading.

Requirements:
- Be maximally terse and information-dense
- Output only essential facts: names, numbers, URLs, contact methods
- No explanatory prose, no introductions, no conclusions
- Use minimal formatting (simple lists or key-value pairs)
- Prioritize verified, official sources only
- This information may be used in crisis situations - accuracy is critical

Output raw data only.`
      },
      {
        role: 'user',
        content: input
      }
    ];

    try {
      let fullResponse = '';

      // Call online-capable model
      for await (const chunk of this.provider.streamChat({
        messages,
        model: 'openai/gpt-4.1-mini:online',  // Online search capability
        temperature: 0.3,  // Low temp for factual accuracy
        maxTokens: 800
      })) {
        if (chunk.type === 'content' && chunk.content) {
          fullResponse += chunk.content;
        }
      }

      const duration = Date.now() - startTime;

      yield {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'interception',
        step: 'tool_call_complete',
        description: `Tool ${this.name} completed successfully`,
        data: {
          toolName: this.name,
          duration,
          responseLength: fullResponse.length
        }
      };

      // Format as structured knowledge
      const knowledge = `<RELEVANT_KNOWLEDGE source="${this.name}" timestamp="${new Date().toISOString()}">\n${fullResponse}\n</RELEVANT_KNOWLEDGE>`;

      return {
        success: true,
        knowledge,
        metadata: {
          duration,
          model: 'openai/gpt-4.1-mini:online',
          responseLength: fullResponse.length
        }
      };
    } catch (error) {
      yield {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'interception',
        step: 'tool_call_error',
        description: `Tool ${this.name} failed`,
        data: {
          toolName: this.name,
          error: String(error)
        }
      };

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
