import { execSync } from 'node:child_process';
import type { RemediationInfo, RemediationResult } from '../../shared/types';
import { getInstructions } from '../instructions';
import type { ComplianceRemediation } from '../types';

const TARGET_IDLE_TIME_SECONDS = 300; // 5 minutes

/**
 * Linux screen lock remediation.
 * Auto-fixes without admin privileges by setting GNOME gsettings:
 *  - idle-delay to 5 minutes
 *  - lock-enabled to true
 *  - lock-delay to 0 (immediate)
 */
export class LinuxScreenLockRemediation implements ComplianceRemediation {
  checkType = 'screen_lock' as const;

  getInfo(): RemediationInfo {
    const { description, steps } = getInstructions('linux', 'screen_lock');
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
      // Set idle delay to 5 minutes
      execSync(`gsettings set org.gnome.desktop.session idle-delay ${TARGET_IDLE_TIME_SECONDS}`, {
        encoding: 'utf-8',
        timeout: 10000,
      });

      // Enable screen lock
      execSync('gsettings set org.gnome.desktop.screensaver lock-enabled true', {
        encoding: 'utf-8',
        timeout: 10000,
      });

      // Set lock delay to 0 (immediately after screen saver)
      execSync('gsettings set org.gnome.desktop.screensaver lock-delay 0', {
        encoding: 'utf-8',
        timeout: 10000,
      });

      return {
        checkType: this.checkType,
        success: true,
        message: `Screen lock configured: ${TARGET_IDLE_TIME_SECONDS / 60}-minute timeout with immediate lock`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // gsettings not available (non-GNOME DE)
      if (errorMessage.includes('No such schema') || errorMessage.includes('not found')) {
        return {
          checkType: this.checkType,
          success: false,
          message:
            'Auto-fix is only available for GNOME desktop. Please configure screen lock manually in your desktop settings.',
        };
      }

      return {
        checkType: this.checkType,
        success: false,
        message: `Failed to configure screen lock: ${errorMessage}`,
      };
    }
  }
}
