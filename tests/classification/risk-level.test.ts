import { describe, test, expect, beforeEach } from 'vitest';
import { RiskClassifier } from '../../lib/classification/RiskClassifier.js';
import { FakeProvider } from '../../lib/providers/FakeProvider.js';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

/**
 * Build the exact messages key that BaseJudge / classifiers send to providers.
 * Mirrors BaseJudge.buildConversationPayload so FakeProvider can match on it.
 */
function buildJudgeMessagesKey(messages: ConversationMessage[]): string {
  const lines: string[] = [];

  lines.push(
    'The following XML contains the conversation to analyze. ' +
      'Use all turns, but place extra emphasis on <CITE_LATEST_USER_TURN>.'
  );
  lines.push('');
  lines.push('<CITE_CONVERSATION>');

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
    lines.push(`  <CITE_TURN index="${idx}" role="${msg.role}">${escaped}</CITE_TURN>`);
  }

  lines.push('</CITE_CONVERSATION>');

  if (latestUserIndex !== -1) {
    lines.push('');
    const escapedLatest = latestUserContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    lines.push(
      `<CITE_LATEST_USER_TURN index="${latestUserIndex}">${escapedLatest}</CITE_LATEST_USER_TURN>`
    );
  }

  const payload = lines.join('\n');
  const llmMessages = [{ role: 'user', content: payload }];
  return JSON.stringify(llmMessages);
}

describe('RiskClassifier (unit tests with FakeProvider)', () => {
  let provider: FakeProvider;
  let classifier: RiskClassifier;

  beforeEach(() => {
    provider = new FakeProvider();
    classifier = new RiskClassifier(provider);
  });

  test('classifies general question as none risk', async () => {
    // Mock response
    provider.addMockResponse(
      buildJudgeMessagesKey([
        { role: 'user', content: "What's the weather like today?" },
      ]),
      '<language>en</language><reflection>General knowledge question with no mental health concerns.</reflection><classification>CLASS_NONE</classification>'
    );

    const result = await classifier.classifyRisk([
      { role: 'user', content: "What's the weather like today?" },
    ]);

    expect(result.risk_level).toBe('none');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.language).toBe('en');
  });

  test('classifies work stress as low risk', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([
        { role: 'user', content: "I'm feeling stressed about work lately" },
      ]),
      '<language>en</language><locale>en-US</locale><reflection>General work stress without self-harm indicators.</reflection><classification>CLASS_LOW</classification>'
    );

    const result = await classifier.classifyRisk([
      { role: 'user', content: "I'm feeling stressed about work lately" },
    ]);

    expect(result.risk_level).toBe('low');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.language).toBe('en');
    expect(result.locale).toBe('en-US');
  });

  test('classifies passive ideation as medium risk', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([
        { role: 'user', content: 'Sometimes I wish I could just disappear' },
      ]),
      '<language>en</language><reflection>Passive suicidal ideation without specific plan or intent.</reflection><classification>CLASS_MEDIUM</classification>'
    );

    const result = await classifier.classifyRisk([
      { role: 'user', content: 'Sometimes I wish I could just disappear' },
    ]);

    expect(result.risk_level).toBe('medium');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.language).toBe('en');
  });

  test('classifies active ideation with method as high risk', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([
        { role: 'user', content: "I've been thinking about how I'd do it" },
      ]),
      '<language>en</language><reflection>User has identified thinking about methods, indicating active ideation with method consideration.</reflection><classification>CLASS_HIGH</classification>'
    );

    const result = await classifier.classifyRisk([
      { role: 'user', content: "I've been thinking about how I'd do it" },
    ]);

    expect(result.risk_level).toBe('high');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.language).toBe('en');
  });

  test('classifies specific plan with timeline as critical risk', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([
        {
          role: 'user',
          content: "I'm going to do it tonight. I have the pills ready.",
        },
      ]),
      '<language>en</language><reflection>Explicit plan with method (pills), timeframe (tonight), and intent to act. Imminent risk.</reflection><classification>CLASS_CRITICAL</classification>'
    );

    const result = await classifier.classifyRisk([
      { role: 'user', content: "I'm going to do it tonight. I have the pills ready." },
    ]);

    expect(result.risk_level).toBe('critical');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.language).toBe('en');
  });

  test('handles unknown classification gracefully', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([{ role: 'user', content: 'test message' }]),
      '<language>en</language><reflection>Some reflection</reflection><classification>CLASS_UNKNOWN</classification>'
    );

    const result = await classifier.classifyRisk([
      { role: 'user', content: 'test message' },
    ]);

    // Should default to medium with low confidence
    expect(result.risk_level).toBe('medium');
    expect(result.confidence).toBeLessThanOrEqual(0.5);
    expect(result.language).toBe('en');
  });

  test('handles missing reflection tag', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([{ role: 'user', content: 'test message' }]),
      '<language>en</language><classification>CLASS_LOW</classification>'
    );

    const result = await classifier.classifyRisk([
      { role: 'user', content: 'test message' },
    ]);

    expect(result.risk_level).toBe('low');
    expect(result.explanation).toContain('No reflection provided');
    expect(result.language).toBe('en');
  });

  test('single judge mode does not return agreement metric', async () => {
    provider.addMockResponse(
      buildJudgeMessagesKey([{ role: 'user', content: 'test' }]),
      '<language>en</language><reflection>Test</reflection><classification>CLASS_NONE</classification>'
    );

    const result = await classifier.classifyRisk([{ role: 'user', content: 'test' }]);

    expect(result.agreement).toBeUndefined();
    expect(result.language).toBe('en');
  });
});
