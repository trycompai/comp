import { execSync } from 'node:child_process';
import type { RemediationInfo, RemediationResult } from '../../shared/types';
import { getInstructions } from '../instructions';
import type { ComplianceRemediation } from '../types';

const REQUIRED_MIN_LENGTH = 8;

/**
 * macOS password policy remediation.
 * Uses osascript to run pwpolicy with administrator privileges,
 * which shows the native macOS password dialog.
 */
export class MacOSPasswordPolicyRemediation implements ComplianceRemediation {
  checkType = 'password_policy' as const;

  getInfo(): RemediationInfo {
    const { description, steps } = getInstructions('macos', 'password_policy');
    return {
      checkType: this.checkType,
      available: true,
      type: 'admin_fix',
      requiresAdmin: true,
      description,
      instructions: steps,
    };
  }

  async remediate(): Promise<RemediationResult> {
    try {
      // Use osascript to elevate privileges — shows native macOS admin password dialog
      // Escaped quotes: osascript uses single-quoted AppleScript, inner shell command uses escaped double quotes
      const command = `pwpolicy -setglobalpolicy \\\"minChars=${REQUIRED_MIN_LENGTH}\\\"`;
      execSync(
        `osascript -e 'do shell script "${command}" with administrator privileges'`,
        { encoding: 'utf-8', timeout: 60000 }, // 60s timeout to allow for password entry
      );

      return {
        checkType: this.checkType,
        success: true,
        message: `Password policy set: minimum ${REQUIRED_MIN_LENGTH} characters required`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // User cancelled the admin dialog
      if (errorMessage.includes('User canceled') || errorMessage.includes('-128')) {
        return {
          checkType: this.checkType,
          success: false,
          message: 'Administrator authentication was cancelled',
        };
      }

      return {
        checkType: this.checkType,
        success: false,
        message: `Failed to set password policy: ${errorMessage}`,
      };
    }
  }
}
