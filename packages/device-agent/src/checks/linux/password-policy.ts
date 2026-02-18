import { readFileSync } from 'node:fs';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

const REQUIRED_MIN_LENGTH = 8;

/**
 * Checks if a minimum password length policy (>= 8 characters) is enforced on Linux.
 *
 * Detection methods:
 *  1. Parse /etc/login.defs for PASS_MIN_LEN
 *  2. Check PAM config for pam_pwquality or pam_cracklib minlen setting
 */
export class LinuxPasswordPolicyCheck implements ComplianceCheck {
  checkType = 'password_policy' as const;
  displayName = 'Password Policy (Min 8 Characters)';

  async run(): Promise<CheckResult> {
    try {
      // Check PAM config first (more reliable on modern distros)
      const pamResult = this.checkPamConfig();
      if (pamResult !== null) {
        return pamResult;
      }

      // Fall back to /etc/login.defs
      const loginDefsResult = this.checkLoginDefs();
      if (loginDefsResult !== null) {
        return loginDefsResult;
      }

      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'pam + login.defs',
          raw: 'No password policy found',
          message: `No minimum password length policy detected. A minimum of ${REQUIRED_MIN_LENGTH} characters is required.`,
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'pam + login.defs',
          raw: error instanceof Error ? error.message : String(error),
          message: 'Unable to determine password policy',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private checkPamConfig(): CheckResult | null {
    // Check common PAM config paths for pam_pwquality or pam_cracklib
    const pamPaths = [
      '/etc/pam.d/common-password',
      '/etc/pam.d/system-auth',
      '/etc/security/pwquality.conf',
    ];

    for (const pamPath of pamPaths) {
      try {
        const content = readFileSync(pamPath, 'utf-8');

        // Look for minlen in pam_pwquality or pam_cracklib config
        const minlenMatch = content.match(/minlen\s*=\s*(\d+)/i);
        if (minlenMatch) {
          const minLength = parseInt(minlenMatch[1], 10);
          const passed = minLength >= REQUIRED_MIN_LENGTH;

          return {
            checkType: this.checkType,
            passed,
            details: {
              method: pamPath,
              raw: `minlen=${minLength}`,
              message: passed
                ? `Password policy enforces minimum ${minLength} characters`
                : `Password policy requires only ${minLength} characters (minimum ${REQUIRED_MIN_LENGTH} required)`,
            },
            checkedAt: new Date().toISOString(),
          };
        }
      } catch {
        // File not found or not readable, try next
      }
    }

    return null;
  }

  private checkLoginDefs(): CheckResult | null {
    try {
      const content = readFileSync('/etc/login.defs', 'utf-8');

      // Look for PASS_MIN_LEN (not commented out)
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed) continue;

        const match = trimmed.match(/^PASS_MIN_LEN\s+(\d+)/);
        if (match) {
          const minLength = parseInt(match[1], 10);
          const passed = minLength >= REQUIRED_MIN_LENGTH;

          return {
            checkType: this.checkType,
            passed,
            details: {
              method: '/etc/login.defs',
              raw: `PASS_MIN_LEN=${minLength}`,
              message: passed
                ? `Password policy enforces minimum ${minLength} characters`
                : `Password policy requires only ${minLength} characters (minimum ${REQUIRED_MIN_LENGTH} required)`,
            },
            checkedAt: new Date().toISOString(),
          };
        }
      }
    } catch {
      // /etc/login.defs not readable
    }

    return null;
  }
}
