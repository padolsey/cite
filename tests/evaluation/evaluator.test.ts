/**
 * Evaluator Tests
 *
 * Unit tests for the main Evaluator orchestrator
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { Evaluator } from '../../lib/evaluation/Evaluator.js';
import { RiskClassifier } from '../../lib/classification/RiskClassifier.js';
import { ResourceResolver } from '../../lib/resources/ResourceResolver.js';
import { FakeProvider } from '../../lib/providers/FakeProvider.js';
import type { EvaluateRequest } from '../../lib/evaluation/types.js';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

/**
 * Build the exact messages key that BaseJudge / classifiers send to providers.
 * Mirrors BaseJudge.buildConversationPayload so FakeProvider can match on it.
 */
function buildJudgeMessagesKey(messages: ConversationMessage[]): string {
  const lines: string[] = [];

  lines.push(
    'The following XML contains the conversation to analyze. ' +
      'Use all turns, but place extra emphasis on <latest_user_turn>.'
  );
  lines.push('');
  lines.push('<conversation>');

  let idx = 0;
  let latestUserIndex = -1;
  let latestUserContent = '';

  for (const msg of messages) {
    if (msg.role !== 'user' && msg.role !== 'assistant') continue;

    idx += 1;
    if (msg.role === 'user') {
      latestUserIndex = idx;
      latestUserContent = msg.content;
    }

    const escaped = msg.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    lines.push(`  <turn index="${idx}" role="${msg.role}">${escaped}</turn>`);
  }

  lines.push('</conversation>');

  if (latestUserIndex !== -1) {
    lines.push('');
    const escapedLatest = latestUserContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    lines.push(
      `<latest_user_turn index="${latestUserIndex}">${escapedLatest}</latest_user_turn>`
    );
  }

  const payload = lines.join('\n');
  const llmMessages = [{ role: 'user', content: payload }];
  return JSON.stringify(llmMessages);
}

describe('Evaluator', () => {
  let provider: FakeProvider;
  let classifier: RiskClassifier;
  let resourceResolver: ResourceResolver;
  let evaluator: Evaluator;

  beforeEach(() => {
    provider = new FakeProvider();
    classifier = new RiskClassifier(provider);
    resourceResolver = new ResourceResolver();
    evaluator = new Evaluator({ classifier, resourceResolver });
  });

  /**
   * Test: Basic evaluation (none risk)
   */
  test('evaluates general conversation as none risk', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([
        { role: 'user', content: "What's the weather today?" },
      ]),
      '<reflection>General question about weather</reflection><classification>CLASS_NONE</classification>'
    );

    const request: EvaluateRequest = {
      messages: [{ role: 'user', content: "What's the weather today?" }],
      config: {
        user_country: 'US',
      },
    };

    const response = await evaluator.evaluate(request);

    expect(response.risk_level).toBe('none');
    expect(response.confidence).toBeGreaterThan(0.9);
    expect(response.show_crisis_resources).toBe(false);
    expect(response.highlight_urgency).toBe(false);
    expect(response.allow_method_details).toBe(true);
    expect(response.log_recommended).toBe(false);
    expect(response.safe_reply).toBeDefined();
    expect(response.crisis_resources.length).toBeGreaterThan(0);
  });

  /**
   * Test: Medium risk evaluation
   */
  test('evaluates passive ideation as medium risk with constraints', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([
        { role: 'user', content: 'I wish I could just not wake up' },
      ]),
      '<reflection>Passive suicidal ideation detected</reflection><classification>CLASS_MEDIUM</classification>'
    );

    const request: EvaluateRequest = {
      messages: [{ role: 'user', content: 'I wish I could just not wake up' }],
      config: {
        user_country: 'US',
      },
    };

    const response = await evaluator.evaluate(request);

    expect(response.risk_level).toBe('medium');
    expect(response.show_crisis_resources).toBe(true);
    expect(response.highlight_urgency).toBe(false);
    expect(response.allow_method_details).toBe(false);
    expect(response.log_recommended).toBe(true);

    // Should include advanced fields
    expect(response.actions).toBeDefined();
    expect(response.actions?.recommended.length).toBeGreaterThan(0);

    expect(response.constraints).toBeDefined();
    expect(response.constraints?.allow_method_details).toBe(false);
    expect(response.constraints?.use_safety_focused_responses).toBe(true);

    expect(response.ui_guidance).toBeDefined();
    expect(response.ui_guidance?.show_crisis_resources).toBe(true);
  });

  /**
   * Test: Critical risk evaluation
   */
  test('evaluates imminent plan as critical risk with urgent guidance', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([
        { role: 'user', content: "I'm doing it tonight. I have the pills." },
      ]),
      '<reflection>Imminent risk with specific plan and means</reflection><classification>CLASS_CRITICAL</classification>'
    );

    const request: EvaluateRequest = {
      messages: [{ role: 'user', content: "I'm doing it tonight. I have the pills." }],
      config: {
        user_country: 'US',
      },
    };

    const response = await evaluator.evaluate(request);

    expect(response.risk_level).toBe('critical');
    expect(response.show_crisis_resources).toBe(true);
    expect(response.highlight_urgency).toBe(true);
    expect(response.allow_method_details).toBe(false);
    expect(response.log_recommended).toBe(true);

    // Critical should have strict actions
    expect(response.actions?.required.length).toBeGreaterThan(0);
    expect(response.actions?.required).toContain('Show crisis resources prominently');

    // Critical should have strict UI guidance
    expect(response.ui_guidance?.allow_further_chat).toBe(false);
    expect(response.ui_guidance?.require_acknowledgement).toBe(true);
    expect(response.ui_guidance?.limit_remaining_messages).toBe(2);
  });

  /**
   * Test: Age band affects safe reply
   */
  test('safe reply differs for minor vs adult', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([
        { role: 'user', content: 'I feel hopeless' },
      ]),
      '<reflection>Expression of hopelessness</reflection><classification>CLASS_MEDIUM</classification>'
    );

    const requestAdult: EvaluateRequest = {
      messages: [{ role: 'user', content: 'I feel hopeless' }],
      config: {
        user_country: 'US',
        user_age_band: 'adult',
      },
    };

    const requestMinor: EvaluateRequest = {
      messages: [{ role: 'user', content: 'I feel hopeless' }],
      config: {
        user_country: 'US',
        user_age_band: 'minor',
      },
    };

    const responseAdult = await evaluator.evaluate(requestAdult);
    const responseMinor = await evaluator.evaluate(requestMinor);

    expect(responseAdult.safe_reply).toBeDefined();
    expect(responseMinor.safe_reply).toBeDefined();
    expect(responseAdult.safe_reply).not.toBe(responseMinor.safe_reply);
    expect(responseMinor.safe_reply).toContain('trusted adult');
  });

  /**
   * Test: return_assistant_reply=false skips safe reply
   */
  test('skips safe reply when return_assistant_reply=false', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([
        { role: 'user', content: "What's the weather?" },
      ]),
      '<reflection>General question</reflection><classification>CLASS_NONE</classification>'
    );

    const request: EvaluateRequest = {
      messages: [{ role: 'user', content: "What's the weather?" }],
      config: {
        user_country: 'US',
        return_assistant_reply: false,
      },
    };

    const response = await evaluator.evaluate(request);

    expect(response.safe_reply).toBeUndefined();
  });

  /**
   * Test: Crisis resources vary by country
   */
  test('resolves country-specific crisis resources', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([{ role: 'user', content: 'I feel sad' }]),
      '<reflection>Expression of sadness</reflection><classification>CLASS_LOW</classification>'
    );

    const requestUS: EvaluateRequest = {
      messages: [{ role: 'user', content: 'I feel sad' }],
      config: { user_country: 'US' },
    };

    const requestGB: EvaluateRequest = {
      messages: [{ role: 'user', content: 'I feel sad' }],
      config: { user_country: 'GB' },
    };

    const responseUS = await evaluator.evaluate(requestUS);
    const responseGB = await evaluator.evaluate(requestGB);

    expect(responseUS.crisis_resources.some(r => r.name.includes('988'))).toBe(true);
    expect(responseGB.crisis_resources.some(r => r.name.includes('Samaritans'))).toBe(true);
  });

  /**
   * Test: Risk trend calculation
   */
  test('calculates risk trend from previous state', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([{ role: 'user', content: 'I have a plan now' }]),
      '<reflection>Active planning detected</reflection><classification>CLASS_HIGH</classification>'
    );

    const request: EvaluateRequest = {
      messages: [{ role: 'user', content: 'I have a plan now' }],
      config: { user_country: 'US' },
      risk_state: {
        conversation_id: 'test-123',
        version: 1,
        max_risk: 'medium',
        current_risk: 'medium',
        confidence: 0.75,
        trend: 'stable',
        last_high_risk_at: null,
        attempt_mentioned: false,
        updated_at: new Date().toISOString(),
      },
    };

    const response = await evaluator.evaluate(request);

    expect(response.trend).toBe('up');
    expect(response.trend_explanation).toContain('increased');
    expect(response.trend_explanation).toContain('medium');
    expect(response.trend_explanation).toContain('high');
  });

  /**
   * Test: Risk state tracking
   */
  test('builds risk state when conversation_id provided', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([
        { role: 'user', content: 'I feel overwhelmed' },
      ]),
      '<reflection>Expression of overwhelm</reflection><classification>CLASS_LOW</classification>'
    );

    const request: EvaluateRequest = {
      messages: [{ role: 'user', content: 'I feel overwhelmed' }],
      config: { user_country: 'US' },
      conversation_id: 'test-456',
    };

    const response = await evaluator.evaluate(request);

    expect(response.risk_state).toBeDefined();
    expect(response.risk_state?.conversation_id).toBe('test-456');
    expect(response.risk_state?.version).toBe(1);
    expect(response.risk_state?.current_risk).toBe('low');
    expect(response.risk_state?.max_risk).toBe('low');
    expect(response.risk_state?.updated_at).toBeDefined();
  });

  /**
   * Test: Risk state tracks maximum risk
   */
  test('risk state tracks maximum risk seen', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([
        { role: 'user', content: 'Actually, I feel better now' },
      ]),
      '<reflection>Improved mood</reflection><classification>CLASS_LOW</classification>'
    );

    const request: EvaluateRequest = {
      messages: [{ role: 'user', content: 'Actually, I feel better now' }],
      config: { user_country: 'US' },
      conversation_id: 'test-789',
      risk_state: {
        conversation_id: 'test-789',
        version: 2,
        max_risk: 'high', // Previously was high
        current_risk: 'medium',
        confidence: 0.8,
        trend: 'down',
        last_high_risk_at: new Date().toISOString(),
        attempt_mentioned: true,
        updated_at: new Date().toISOString(),
      },
    };

    const response = await evaluator.evaluate(request);

    expect(response.risk_state?.max_risk).toBe('high'); // Maintains max
    expect(response.risk_state?.current_risk).toBe('low'); // Updated to current
    expect(response.risk_state?.version).toBe(3); // Incremented
    expect(response.trend).toBe('down');
  });

  /**
   * Test: Low/none risk doesn't include advanced fields
   */
  test('low risk does not include advanced fields', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([
        { role: 'user', content: "I'm feeling stressed" },
      ]),
      '<reflection>General stress</reflection><classification>CLASS_LOW</classification>'
    );

    const request: EvaluateRequest = {
      messages: [{ role: 'user', content: "I'm feeling stressed" }],
      config: { user_country: 'US' },
    };

    const response = await evaluator.evaluate(request);

    expect(response.risk_level).toBe('low');
    expect(response.actions).toBeUndefined();
    expect(response.constraints).toBeUndefined();
    expect(response.ui_guidance).toBeUndefined();
  });
});
