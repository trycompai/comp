import { execSync } from 'node:child_process';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

const REQUIRED_MIN_LENGTH = 8;

/**
 * Checks if a minimum password length policy (>= 8 characters) is enforced on Windows.
 *
 * Uses `net accounts` to read the local password policy.
 * The output includes "Minimum password length" which we parse.
 */
export class WindowsPasswordPolicyCheck implements ComplianceCheck {
  checkType = 'password_policy' as const;
  displayName = 'Password Policy (Min 8 Characters)';

  async run(): Promise<CheckResult> {
    try {
      const output = execSync('net accounts', {
        encoding: 'utf-8',
        timeout: 10000,
      }).trim();

      // Parse "Minimum password length" from the output
      // Example line: "Minimum password length                  8"
      const minLengthMatch = output.match(/minimum password length\s+(\d+)/i);

      if (!minLengthMatch) {
        return {
          checkType: this.checkType,
          passed: false,
          details: {
            method: 'net accounts',
            raw: output.substring(0, 500),
            message: 'Could not determine minimum password length from system policy',
          },
          checkedAt: new Date().toISOString(),
        };
      }

      const minLength = parseInt(minLengthMatch[1], 10);
      const passed = minLength >= REQUIRED_MIN_LENGTH;

      return {
        checkType: this.checkType,
        passed,
        details: {
          method: 'net accounts',
          raw: output.substring(0, 500),
          message: passed
            ? `Password policy enforces minimum ${minLength} characters`
            : `Password policy requires only ${minLength} characters (minimum ${REQUIRED_MIN_LENGTH} required)`,
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Try PowerShell fallback with local security policy
      return this.fallbackPowerShell();
    }
  }

  private fallbackPowerShell(): CheckResult {
    try {
      const output = execSync(
        'powershell.exe -NoProfile -NonInteractive -Command "(([ADSI]\'WinNT://./,computer\').PasswordMinimumLength)"',
        { encoding: 'utf-8', timeout: 10000 },
      ).trim();

      const minLength = parseInt(output, 10);

      if (isNaN(minLength)) {
        return {
          checkType: this.checkType,
          passed: false,
          details: {
            method: 'ADSI WinNT',
            raw: output,
            message: 'Could not parse minimum password length',
          },
          checkedAt: new Date().toISOString(),
        };
      }

      const passed = minLength >= REQUIRED_MIN_LENGTH;

      return {
        checkType: this.checkType,
        passed,
        details: {
          method: 'ADSI WinNT',
          raw: `Minimum password length: ${minLength}`,
          message: passed
            ? `Password policy enforces minimum ${minLength} characters`
            : `Password policy requires only ${minLength} characters (minimum ${REQUIRED_MIN_LENGTH} required)`,
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'net accounts + ADSI',
          raw: error instanceof Error ? error.message : String(error),
          message: 'Unable to determine password policy',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }
}
