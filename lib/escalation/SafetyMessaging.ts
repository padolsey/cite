import type { RiskAssessment } from '../types';
import { SAFETY_MESSAGES } from '../../src/lib/constants/safetyMessages';

/**
 * Determines appropriate safety messaging based on risk assessment
 */
export class SafetyMessaging {
  /**
   * Determines the modal mode based on risk assessment
   */
  private determineMode(assessment: RiskAssessment): {
    mode: 'crisis_immediate' | 'distress_acute' | 'support_general';
    showBreathing: boolean;
    showGame: boolean;
    defaultTab: 'breathing' | 'game' | 'resources';
  } {
    // High/Critical + mental_health/crisis = immediate crisis
    // Resources ONLY - person needs professional intervention NOW
    if (
      (assessment.level === 'high' || assessment.level === 'critical') &&
      (assessment.categories.includes('mental_health') ||
       assessment.categories.includes('crisis'))
    ) {
      return {
        mode: 'crisis_immediate',
        showBreathing: false,
        showGame: false,
        defaultTab: 'resources'
      };
    }

    // Medium/High = acute distress (panic, anxiety, overwhelm)
    // Show all tools, start with breathing as grounding
    if (assessment.level === 'medium' || assessment.level === 'high') {
      return {
        mode: 'distress_acute',
        showBreathing: true,
        showGame: true,
        defaultTab: 'breathing'
      };
    }

    // Everything else = general support
    // Show all tools, start with resources
    return {
      mode: 'support_general',
      showBreathing: true,
      showGame: true,
      defaultTab: 'resources'
    };
  }

  generateMessage(assessment: RiskAssessment): {
    shouldInsert: boolean;
    position: 'prefix' | 'suffix';
    content: string;
  } | null {
    // Only insert for medium+ risk with specific categories
    if (assessment.level === 'none' || assessment.level === 'low') {
      return null;
    }

    // Check for mental health crisis
    if (
      assessment.categories.includes('mental_health') ||
      assessment.categories.includes('crisis')
    ) {
      return {
        shouldInsert: true,
        position: 'prefix',
        content:
          SAFETY_MESSAGES.mental_health.prefix +
          SAFETY_MESSAGES.mental_health.resources
      };
    }

    // Check for harmful requests
    if (assessment.categories.includes('harmful_advice')) {
      return {
        shouldInsert: true,
        position: 'prefix',
        content:
          SAFETY_MESSAGES.harmful_advice.prefix +
          SAFETY_MESSAGES.harmful_advice.alternative
      };
    }

    return null;
  }

  /**
   * Wraps a content stream, sending safety banner as metadata
   */
  async *wrapStream(
    stream: AsyncGenerator<any, void, undefined>,
    assessment: RiskAssessment,
    onProcessEvent?: (event: any) => void
  ): AsyncGenerator<any, void, undefined> {
    const message = this.generateMessage(assessment);

    if (!message) {
      // No safety message needed, pass through
      yield* stream;
      return;
    }

    // Determine mode based on risk level and categories
    const modeConfig = this.determineMode(assessment);

    onProcessEvent?.({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'escalation',
      step: 'safety_banner_prepared',
      description: `Prepared crisis resources banner (${modeConfig.mode})`,
      data: {
        categories: assessment.categories,
        mode: modeConfig.mode,
        showBreathing: modeConfig.showBreathing,
        showGame: modeConfig.showGame
      }
    });

    // Send safety banner as metadata chunk (not inline content)
    const category = assessment.categories.find(c =>
      c === 'mental_health' || c === 'crisis' || c === 'harmful_advice'
    ) || 'general';

    const bannerData = SAFETY_MESSAGES[category] || SAFETY_MESSAGES.mental_health;

    yield {
      type: 'safety_banner',
      safetyBanner: {
        category,
        resources: bannerData.resources,
        prefix: bannerData.prefix,
        mode: modeConfig.mode,
        showBreathing: modeConfig.showBreathing,
        showGame: modeConfig.showGame,
        defaultTab: modeConfig.defaultTab
      }
    };

    // Stream main content without inline safety messages
    yield* stream;
  }
}
