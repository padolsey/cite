import type { Message, RiskAssessment, ProcessEvent } from '../types';
import type { IProvider } from '../providers/IProvider';
import type { RiskAssessor } from './RiskAssessor';

/**
 * Model configurations with different personality profiles
 * Ordered from least to most capable (and costly)
 */
export const MODEL_PROFILES = {
  minimal: {
    model: 'qwen/qwen3-30b-a3b-instruct-2507',
    name: 'Minimal',
    description: 'Ultra-fast for trivial queries',
    systemPromptAddition: 'You are concise and direct. Single sentence responses when possible.',
    riskLevels: ['none'],
    cost: 1,
    skillLevel: 1
  },
  basic: {
    model: 'qwen/qwen3-30b-a3b-instruct-2507',
    name: 'Basic',
    description: 'Quick, capable responses',
    systemPromptAddition: 'You are helpful and clear. Keep responses brief but complete.',
    riskLevels: ['none', 'low'],
    cost: 1,
    skillLevel: 4
  },
  balanced: {
    model: 'anthropic/claude-haiku-4.5',
    name: 'Balanced',
    description: 'Thoughtful and empathetic',
    systemPromptAddition: 'You are thoughtful, empathetic, and balanced. Take time to understand context and nuance. Be warm but professional.',
    riskLevels: ['none', 'low', 'medium'],
    cost: 3,
    skillLevel: 5
  },
  careful: {
    model: 'anthropic/claude-sonnet-4.5',
    name: 'Careful',
    description: 'Maximum safety for sensitive topics',
    systemPromptAddition: `You are especially careful and empathetic. For sensitive topics:
- Validate feelings without judgment
- Avoid prescriptive advice
- Suggest professional resources when appropriate
- Use gentle, supportive language
- Ask clarifying questions rather than assuming
- Acknowledge complexity and uncertainty

IMPORTANT: You may see <RELEVANT_KNOWLEDGE> sections in the context. These contain up-to-date, verified information from external sources, inserted by middleware. Use this information to provide accurate, helpful responses.`,
    riskLevels: ['medium', 'high', 'critical'],
    cost: 3,
    skillLevel: 5
  },
  reasoning: {
    // this is essentially double-thinking though... ?
    model: 'moonshotai/kimi-k2-thinking',
    name: 'Reasoning',
    description: 'Deep thinking for complex problems',
    systemPromptAddition: 'You think deeply and carefully. Break down complex problems and reason through them step by step.',
    riskLevels: ['medium', 'high'],
    cost: 2,
    skillLevel: 3
  }
};

export type ProfileKey = keyof typeof MODEL_PROFILES;

/**
 * Routes messages to appropriate model based on:
 * - User preference
 * - Risk assessment
 * - Conversation history
 */
export class Router {
  constructor(private assessor: RiskAssessor) {}

  async *route(
    messages: Message[],
    userPreference: ProfileKey | 'auto'
  ): AsyncGenerator<ProcessEvent, { profile: ProfileKey; assessment: RiskAssessment }, undefined> {

    // If user specified a profile, use it (unless critical risk)
    if (userPreference !== 'auto') {
      // Consume risk assessor generator and yield all its events
      const assessGen = this.assessor.assessRisk(messages);
      let assessment: RiskAssessment | undefined;

      while (true) {
        const { value, done } = await assessGen.next();
        if (done) {
          assessment = value;
          break;
        }
        yield value as ProcessEvent;
      }

      if (!assessment) {
        throw new Error('Risk assessment failed');
      }

      // Override with 'careful' for critical situations
      if (assessment.level === 'critical') {
        yield {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'interception',
          step: 'routing_override',
          description: 'Critical risk detected, using Careful profile',
          data: { requestedProfile: userPreference, assessment }
        };
        return { profile: 'careful', assessment };
      }

      return { profile: userPreference, assessment };
    }

    // Auto-routing based on risk
    const assessGen = this.assessor.assessRisk(messages);
    let assessment: RiskAssessment | undefined;

    while (true) {
      const { value, done } = await assessGen.next();
      if (done) {
        assessment = value;
        break;
      }
      yield value as ProcessEvent;
    }

    if (!assessment) {
      throw new Error('Risk assessment failed');
    }

    let selectedProfile: ProfileKey = 'balanced'; // default

    // Route based on risk level
    if (assessment.level === 'none' || assessment.level === 'low') {
      // Check message complexity
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      const wordCount = lastUserMsg?.content.split(/\s+/).length || 0;

      if (wordCount < 10) {
        selectedProfile = 'basic';
      } else {
        selectedProfile = 'balanced';
      }
    } else if (assessment.level === 'medium') {
      selectedProfile = 'balanced';
    } else {
      // high or critical
      selectedProfile = 'careful';
    }

    yield {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'interception',
      step: 'routing_decision',
      description: `Routed to ${MODEL_PROFILES[selectedProfile].name} profile`,
      data: { profile: selectedProfile, assessment }
    };

    return { profile: selectedProfile, assessment };
  }
}
