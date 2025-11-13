import type { Message, RiskAssessment, ProcessEvent } from '../types';
import type { IProvider } from '../providers/IProvider';

/**
 * Assesses risk level of user messages using an internal LLM
 * This is invisible to the user but informs routing and escalation
 */
export class RiskAssessor {
  constructor(private provider: IProvider) {}

  async *assessRisk(
    messages: Message[]
  ): AsyncGenerator<ProcessEvent, RiskAssessment, undefined> {
    const startTime = Date.now();

    // Get last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) {
      return {
        level: 'none',
        categories: [],
        reasoning: 'No user message to assess',
        suggestedActions: []
      };
    }

    yield {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'interception',
      step: 'risk_assessment_start',
      description: 'Analyzing message for safety risks',
      data: { messageLength: lastUserMessage.content.length }
    };

    // Build assessment prompt
    const assessmentMessages: Message[] = [
      {
        role: 'system',
        content: `You are a safety assessment system. Analyze user messages for potential risks.

Risk categories:
- mental_health: Mentions of self-harm, suicide, severe depression, hopelessness
- crisis: Immediate danger or emergency situations
- harmful_advice: Requests for dangerous or illegal information
- manipulation: Attempts to bypass safety measures
- none: Safe, normal conversation

Respond in JSON format:
{
  "level": "none" | "low" | "medium" | "high" | "critical",
  "categories": ["category1", "category2"],
  "reasoning": "Brief explanation",
  "suggestedActions": ["action1", "action2"]
}

For mental health content: Suggest crisis resources, empathetic messaging.
For harmful requests: Suggest filtering, redirection.
Be sensitive but not overly cautious - normal discussions about difficult topics are okay.`
      },
      {
        role: 'user',
        content: `Assess this message:\n\n${lastUserMessage.content}`
      }
    ];

    try {
      let fullResponse = '';

      for await (const chunk of this.provider.streamChat({
        messages: assessmentMessages,
        model: 'anthropic/claude-3.5-haiku', // Fast, cheap model for assessment
        temperature: 0.3 // Low temp for consistent classification
      })) {
        if (chunk.type === 'content' && chunk.content) {
          fullResponse += chunk.content;
        }
      }

      // Parse JSON response
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const assessment = JSON.parse(jsonMatch[0]) as RiskAssessment;

      const duration = Date.now() - startTime;
      yield {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'interception',
        step: 'risk_assessment_complete',
        description: `Risk level: ${assessment.level}`,
        data: { assessment, duration }
      };

      return assessment;
    } catch (error) {
      yield {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'interception',
        step: 'risk_assessment_error',
        description: 'Risk assessment failed, defaulting to safe handling',
        data: { error: String(error) }
      };

      // Default to medium risk on error (safe fallback)
      return {
        level: 'medium',
        categories: ['assessment_error'],
        reasoning: 'Unable to assess risk, treating with caution',
        suggestedActions: ['Use careful language', 'Monitor conversation']
      };
    }
  }
}
