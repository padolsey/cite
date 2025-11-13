import type { RiskAssessment } from '../types';
import type { ProfileKey, MODEL_PROFILES } from '../interception/Router';

/**
 * Determines when to escalate to a more capable or careful model
 */
export class Upskilling {
  /**
   * Checks if we should upskill based on the risk assessment
   * Returns the recommended profile to use
   */
  shouldUpskill(
    currentProfile: ProfileKey,
    assessment: RiskAssessment
  ): { upskill: boolean; recommendedProfile: ProfileKey; reason: string } | null {

    // Critical risk always requires 'careful' profile
    if (assessment.level === 'critical') {
      if (currentProfile !== 'careful') {
        return {
          upskill: true,
          recommendedProfile: 'careful',
          reason: 'Critical risk detected, using most capable and cautious model'
        };
      }
    }

    // High risk should use at least 'balanced', preferably 'careful'
    if (assessment.level === 'high') {
      if (currentProfile === 'basic') {
        return {
          upskill: true,
          recommendedProfile: 'careful',
          reason: 'High risk conversation requires more capable model'
        };
      }
    }

    // Medium risk should use at least 'balanced'
    if (assessment.level === 'medium') {
      if (currentProfile === 'basic') {
        return {
          upskill: true,
          recommendedProfile: 'balanced',
          reason: 'Complex topic requires more nuanced model'
        };
      }
    }

    return null;
  }

  /**
   * Generates a message to explain the upskilling to the user (if visible)
   */
  generateUpskillMessage(
    from: ProfileKey,
    to: ProfileKey,
    reason: string
  ): string {
    return `\n\n*[Switching to ${MODEL_PROFILES[to].name} mode: ${reason}]*\n\n`;
  }
}
