import { execSync } from 'node:child_process';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

const REQUIRED_MIN_LENGTH = 8;

/**
 * Checks if a minimum password length policy (>= 8 characters) is enforced on macOS.
 *
 * Uses `pwpolicy getaccountpolicies` and `pwpolicy -getglobalpolicy` to read password policies.
 * The account policies output is XML that may contain `policyAttributePassword` constraints
 * with a `minChars` or `policyAttributeMinimumLength` attribute.
 * The global policy output is a key=value string that may contain `minChars`.
 *
 * Also checks for MDM-enforced profiles via `system_profiler SPConfigurationProfileDataType`.
 */
export class MacOSPasswordPolicyCheck implements ComplianceCheck {
  checkType = 'password_policy' as const;
  displayName = 'Password Policy (Min 8 Characters)';

  async run(): Promise<CheckResult> {
    try {
      // Try pwpolicy first
      const pwpolicyResult = this.checkPwpolicy();
      if (pwpolicyResult !== null) {
        return pwpolicyResult;
      }

      // Fall back to checking configuration profiles (MDM-enforced)
      const profileResult = this.checkConfigurationProfiles();
      if (profileResult !== null) {
        return profileResult;
      }

      // If no explicit policy is found, macOS doesn't enforce minimum password length by default
      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'pwpolicy + configuration-profiles',
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
          method: 'pwpolicy',
          raw: error instanceof Error ? error.message : String(error),
          message: 'Unable to determine password policy',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private checkPwpolicy(): CheckResult | null {
    // Check getaccountpolicies first
    const accountResult = this.checkAccountPolicies();
    if (accountResult !== null) {
      return accountResult;
    }

    // Fall back to getglobalpolicy
    return this.checkGlobalPolicy();
  }

  private checkAccountPolicies(): CheckResult | null {
    try {
      const output = execSync('pwpolicy getaccountpolicies 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 10000,
      });

      // Look for minimum password length in the XML output
      const minCharsMatch = output.match(/policyAttributePasswordMinimumLength\s*=\s*(\d+)/i);
      const minCharsMatch2 = output.match(/minChars\s*[=:]\s*(\d+)/i);
      const minLengthMatch = output.match(/minimumLength\s*[=:>\s]*(\d+)/i);

      const matches = [minCharsMatch, minCharsMatch2, minLengthMatch].filter(Boolean);

      if (matches.length > 0) {
        const minLength = Math.max(...matches.map((m) => parseInt(m![1], 10)));
        const passed = minLength >= REQUIRED_MIN_LENGTH;

        return {
          checkType: this.checkType,
          passed,
          details: {
            method: 'pwpolicy getaccountpolicies',
            raw: output.substring(0, 500),
            message: passed
              ? `Password policy enforces minimum ${minLength} characters`
              : `Password policy requires only ${minLength} characters (minimum ${REQUIRED_MIN_LENGTH} required)`,
          },
          checkedAt: new Date().toISOString(),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private checkGlobalPolicy(): CheckResult | null {
    try {
      const globalOutput = execSync('pwpolicy -getglobalpolicy 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 10000,
      });

      const globalMinCharsMatch = globalOutput.match(/minChars\s*[=:]\s*(\d+)/i);

      if (globalMinCharsMatch) {
        const minLength = parseInt(globalMinCharsMatch[1], 10);
        const passed = minLength >= REQUIRED_MIN_LENGTH;

        return {
          checkType: this.checkType,
          passed,
          details: {
            method: 'pwpolicy -getglobalpolicy',
            raw: globalOutput.substring(0, 500),
            message: passed
              ? `Password policy enforces minimum ${minLength} characters`
              : `Password policy requires only ${minLength} characters (minimum ${REQUIRED_MIN_LENGTH} required)`,
          },
          checkedAt: new Date().toISOString(),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private checkConfigurationProfiles(): CheckResult | null {
    try {
      const output = execSync('system_profiler SPConfigurationProfileDataType 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 15000,
      });

      // Look for password policy in MDM profiles
      const minLengthMatch = output.match(/minLength\s*[=:]\s*(\d+)/i);
      const minComplexCharsMatch = output.match(/minComplexChars\s*[=:]\s*(\d+)/i);

      if (minLengthMatch) {
        const minLength = parseInt(minLengthMatch[1], 10);
        const passed = minLength >= REQUIRED_MIN_LENGTH;

        return {
          checkType: this.checkType,
          passed,
          details: {
            method: 'system_profiler SPConfigurationProfileDataType',
            raw: `MDM Profile: minLength=${minLength}${minComplexCharsMatch ? `, minComplexChars=${minComplexCharsMatch[1]}` : ''}`,
            message: passed
              ? `MDM profile enforces minimum ${minLength} character password`
              : `MDM profile requires only ${minLength} characters (minimum ${REQUIRED_MIN_LENGTH} required)`,
          },
          checkedAt: new Date().toISOString(),
        };
      }

      return null;
    } catch {
      return null;
    }
  }
}
