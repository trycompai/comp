import { execSync } from 'node:child_process';
import type { RemediationInfo, RemediationResult } from '../../shared/types';
import { getInstructions } from '../instructions';
import type { ComplianceRemediation } from '../types';

const TARGET_IDLE_TIME_SECONDS = 300; // 5 minutes

/**
 * macOS screen lock remediation.
 * Auto-fixes without admin privileges by writing user-level defaults:
 *  - Screen saver idle time set to 5 minutes
 *  - Password required immediately after screen saver
 */
export class MacOSScreenLockRemediation implements ComplianceRemediation {
  checkType = 'screen_lock' as const;

  getInfo(): RemediationInfo {
    const { description, steps } = getInstructions('macos', 'screen_lock');
    return {
      checkType: this.checkType,
      available: true,
      type: 'auto_fix',
      requiresAdmin: false,
      description,
      instructions: steps,
    };
  }

  async remediate(): Promise<RemediationResult> {
    try {
      // Set screen saver idle time to 5 minutes
      execSync(
        `defaults -currentHost write com.apple.screensaver idleTime -int ${TARGET_IDLE_TIME_SECONDS}`,
        { encoding: 'utf-8', timeout: 10000 },
      );

      // Require password immediately after screen saver
      execSync('defaults write com.apple.screensaver askForPassword -int 1', {
        encoding: 'utf-8',
        timeout: 10000,
      });

      // Set password delay to 0 (immediately)
      execSync('defaults write com.apple.screensaver askForPasswordDelay -int 0', {
        encoding: 'utf-8',
        timeout: 10000,
      });

      return {
        checkType: this.checkType,
        success: true,
        message: `Screen lock configured: ${TARGET_IDLE_TIME_SECONDS / 60}-minute timeout with immediate password requirement`,
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        success: false,
        message: `Failed to configure screen lock: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
