import { execSync } from 'node:child_process';
import type { RemediationInfo, RemediationResult } from '../../shared/types';
import { getInstructions } from '../instructions';
import type { ComplianceRemediation } from '../types';

const REQUIRED_MIN_LENGTH = 8;

/**
 * Linux password policy remediation.
 * Uses pkexec for admin elevation to update PASS_MIN_LEN in /etc/login.defs.
 * pkexec shows a graphical authentication dialog on most Linux desktops.
 */
export class LinuxPasswordPolicyRemediation implements ComplianceRemediation {
  checkType = 'password_policy' as const;

  getInfo(): RemediationInfo {
    const { description, steps } = getInstructions('linux', 'password_policy');
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
      // Use pkexec (graphical sudo) to update PASS_MIN_LEN in /etc/login.defs
      // sed replaces existing PASS_MIN_LEN line or appends if not found
      execSync(
        `pkexec bash -c 'if grep -q "^PASS_MIN_LEN" /etc/login.defs; then sed -i "s/^PASS_MIN_LEN.*/PASS_MIN_LEN\\t${REQUIRED_MIN_LENGTH}/" /etc/login.defs; else echo "PASS_MIN_LEN\\t${REQUIRED_MIN_LENGTH}" >> /etc/login.defs; fi'`,
        { encoding: 'utf-8', timeout: 60000 }, // 60s timeout to allow for auth dialog
      );

      return {
        checkType: this.checkType,
        success: true,
        message: `Password policy set: minimum ${REQUIRED_MIN_LENGTH} characters required in /etc/login.defs`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // User cancelled the pkexec dialog
      if (
        errorMessage.includes('dismissed') ||
        errorMessage.includes('Not authorized') ||
        errorMessage.includes('126')
      ) {
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
