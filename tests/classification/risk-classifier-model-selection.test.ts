/**
 * Integration tests for RiskClassifier with model selection
 *
 * Verifies that RiskClassifier correctly selects models based on input size
 * and uses fallback on errors
 */

import { describe, it, expect, vi } from 'vitest';
import { RiskClassifier } from '../../lib/classification/RiskClassifier';
import type { IProvider, ChatOptions, StreamChunk, Message } from '../../lib/providers/IProvider';

// Mock provider that tracks model selections
class ModelSelectionTracker implements IProvider {
  public modelsUsed: string[] = [];
  public streamChatCalls: ChatOptions[] = [];

  constructor(
    private responses: Map<string, string> = new Map()
  ) {}

  async *streamChat(options: ChatOptions): AsyncGenerator<StreamChunk, void, unknown> {
    this.modelsUsed.push(options.model);
    this.streamChatCalls.push(options);

    const response = this.responses.get(options.model) || this.getDefaultResponse();

    yield { type: 'content', content: response };
  }

  private getDefaultResponse(): string {
    return `<language>en</language>
<locale>en-US</locale>
<reflection>Low risk conversation about general topics.</reflection>
<classification>CLASS_LOW</classification>
<risk_types></risk_types>`;
  }
}

describe('RiskClassifier - Model Selection Integration', () => {
  describe('single judge mode', () => {
    it('selects cheapest model for small inputs', async () => {
      const tracker = new ModelSelectionTracker();
      const classifier = new RiskClassifier(tracker, { useMultipleJudges: false });

      const messages: Message[] = [
        { role: 'user', content: 'Hello, how are you?' },
      ];

      await classifier.classifyRisk(messages);

      // Should select gpt-oss-20b (cheapest for small inputs)
      expect(tracker.modelsUsed).toContain('openai/gpt-oss-20b');
    });

    it('excludes models with insufficient context for large inputs', async () => {
      const tracker = new ModelSelectionTracker();
      const classifier = new RiskClassifier(tracker, { useMultipleJudges: false });

      // Create a large message that exceeds qwen3-32b's 40k token limit
      const largeContent = 'test '.repeat(25000); // ~125k tokens

      const messages: Message[] = [
        { role: 'user', content: largeContent },
      ];

      await classifier.classifyRisk(messages);

      // Should NOT use qwen3-32b (only 40k context)
      expect(tracker.modelsUsed).not.toContain('qwen/qwen3-32b');

      // Should use a model with larger context
      const modelUsed = tracker.modelsUsed[0];
      expect(['openai/gpt-oss-120b', 'qwen/qwen3-30b-a3b-instruct-2507', 'google/gemini-2.5-flash', 'moonshotai/kimi-k2-0905', 'anthropic/claude-haiku-4.5', 'openai/gpt-oss-20b'])
        .toContain(modelUsed);
    });

    it('returns valid classification result', async () => {
      const tracker = new ModelSelectionTracker();
      tracker.responses.set('openai/gpt-oss-20b', `<language>en</language>
<locale>en-US</locale>
<reflection>User expresses mild sadness about daily events.</reflection>
<classification>CLASS_LOW</classification>
<risk_types></risk_types>`);

      const classifier = new RiskClassifier(tracker, { useMultipleJudges: false });

      const messages: Message[] = [
        { role: 'user', content: 'I feel a bit sad today.' },
      ];

      const result = await classifier.classifyRisk(messages);

      expect(result.risk_level).toBe('low');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.explanation).toContain('sadness');
      expect(result.language).toBe('en');
      expect(result.locale).toBe('en-US');
    });
  });

  describe('multi-judge mode', () => {
    it('creates judges with different models', async () => {
      const tracker = new ModelSelectionTracker();
      const classifier = new RiskClassifier(tracker, { useMultipleJudges: true });

      const messages: Message[] = [
        { role: 'user', content: 'Hello!' },
      ];

      await classifier.classifyRisk(messages);

      // Should have called 3 different models (judges)
      expect(tracker.modelsUsed).toHaveLength(3);

      // Models should be diverse
      const uniqueModels = new Set(tracker.modelsUsed);
      expect(uniqueModels.size).toBeGreaterThan(1);
    });

    it('returns agreement metric with multiple judges', async () => {
      const tracker = new ModelSelectionTracker();

      // All judges agree on LOW
      tracker.responses.set('openai/gpt-oss-20b', `<language>en</language>
<locale>en-US</locale>
<reflection>Low risk.</reflection>
<classification>CLASS_LOW</classification>
<risk_types></risk_types>`);

      tracker.responses.set('openai/gpt-oss-120b', `<language>en</language>
<locale>en-US</locale>
<reflection>Low risk.</reflection>
<classification>CLASS_LOW</classification>
<risk_types></risk_types>`);

      tracker.responses.set('qwen/qwen3-32b', `<language>en</language>
<locale>en-US</locale>
<reflection>Low risk.</reflection>
<classification>CLASS_LOW</classification>
<risk_types></risk_types>`);

      const classifier = new RiskClassifier(tracker, { useMultipleJudges: true });

      const messages: Message[] = [
        { role: 'user', content: 'Hello!' },
      ];

      const result = await classifier.classifyRisk(messages);

      expect(result.agreement).toBeDefined();
      expect(result.agreement).toBeGreaterThan(0.8); // High agreement
    });
  });

  describe('fallback behavior', () => {
    it('falls back to next model on error', async () => {
      let callCount = 0;

      const mockProvider: IProvider = {
        async *streamChat(options: ChatOptions) {
          callCount++;
          if (callCount === 1) {
            // First call fails
            yield { type: 'error', error: 'Primary model failed' };
          } else {
            // Second call succeeds
            yield {
              type: 'content',
              content: `<language>en</language>
<locale>en-US</locale>
<reflection>Fallback successful.</reflection>
<classification>CLASS_LOW</classification>
<risk_types></risk_types>`
            };
          }
        }
      };

      const classifier = new RiskClassifier(mockProvider, { useMultipleJudges: false });

      const messages: Message[] = [
        { role: 'user', content: 'Test message' },
      ];

      // Should succeed with fallback
      const result = await classifier.classifyRisk(messages);

      expect(result.risk_level).toBe('low');
      expect(callCount).toBeGreaterThan(1); // Used fallback
    });
  });

  describe('conversation serialization', () => {
    it('serializes multi-turn conversations correctly', async () => {
      const tracker = new ModelSelectionTracker();
      const classifier = new RiskClassifier(tracker, { useMultipleJudges: false });

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
        { role: 'assistant', content: 'I am doing well, thanks!' },
        { role: 'user', content: 'I feel sad today.' },
      ];

      await classifier.classifyRisk(messages);

      expect(tracker.streamChatCalls).toHaveLength(1);

      // Check that the serialized conversation was sent
      const call = tracker.streamChatCalls[0];
      expect(call.messages).toHaveLength(1); // Serialized into single user message
      expect(call.messages[0].role).toBe('user');
      expect(call.messages[0].content).toContain('CITE_CONVERSATION');
    });
  });

  describe('debug information', () => {
    it('includes debug info when requested', async () => {
      const tracker = new ModelSelectionTracker();
      const classifier = new RiskClassifier(tracker, { useMultipleJudges: false });

      const messages: Message[] = [
        { role: 'user', content: 'Test' },
      ];

      const result = await classifier.classifyRisk(messages, true); // includeDebug = true

      expect(result.debug_requests).toBeDefined();
      expect(result.debug_requests).toHaveLength(1);
      expect(result.debug_requests![0].model).toBeDefined();
      expect(result.debug_requests![0].systemPrompt).toBeDefined();
    });

    it('omits debug info by default', async () => {
      const tracker = new ModelSelectionTracker();
      const classifier = new RiskClassifier(tracker, { useMultipleJudges: false });

      const messages: Message[] = [
        { role: 'user', content: 'Test' },
      ];

      const result = await classifier.classifyRisk(messages, false); // includeDebug = false

      expect(result.debug_requests).toBeUndefined();
    });
  });
});
