import { execSync } from 'node:child_process';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

const REQUIRED_MIN_LENGTH = 8;
const METHOD = 'pwpolicy getaccountpolicies + configuration-profiles';

/**
 * Checks if a minimum password length policy (>= 8 characters) is enforced on macOS.
 *
 * `pwpolicy getaccountpolicies` (no user) prints the global account policies as an XML
 * plist — the store macOS evaluates when a password is set. A minimum length is expressed
 * as a password content regex, e.g. `policyAttributePassword matches '.{4,}+'` (the
 * 4-character `com.apple.defaultpasswordpolicy.fde` policy a stock Mac ships with). Every
 * content policy has to be satisfied, so the effective minimum is the largest quantifier.
 *
 * An MDM-imposed minimum comes from a Passcode payload and is read from
 * `system_profiler SPConfigurationProfileDataType`. That payload is enforced too, so the
 * effective minimum is the largest value across both sources.
 *
 * The deprecated `pwpolicy -getglobalpolicy` store is deliberately not consulted: it is
 * empty on modern macOS even while an account policy is in effect, so the `minChars` value
 * our own remediation used to write there made this check pass on devices whose password
 * was still 4 characters.
 */
export class MacOSPasswordPolicyCheck implements ComplianceCheck {
  checkType = 'password_policy' as const;
  displayName = 'Password Policy (Min 8 Characters)';

  async run(): Promise<CheckResult> {
    try {
      const accountPolicies = execSync('pwpolicy getaccountpolicies 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 10000,
      });

      const minLengths = [
        this.getContentPolicyMinLength(accountPolicies),
        this.getProfileMinLength(),
      ].filter((minLength): minLength is number => minLength !== null);

      // Nothing constrains the length, so macOS enforces no minimum.
      if (minLengths.length === 0) {
        return {
          checkType: this.checkType,
          passed: false,
          details: {
            method: METHOD,
            raw: accountPolicies.substring(0, 500),
            message: `No minimum password length policy detected. A minimum of ${REQUIRED_MIN_LENGTH} characters is required.`,
          },
          checkedAt: new Date().toISOString(),
        };
      }

      const minLength = Math.max(...minLengths);
      const passed = minLength >= REQUIRED_MIN_LENGTH;

      return {
        checkType: this.checkType,
        passed,
        details: {
          method: METHOD,
          raw: accountPolicies.substring(0, 500),
          message: passed
            ? `Password policy enforces minimum ${minLength} characters`
            : `Password policy requires only ${minLength} characters (minimum ${REQUIRED_MIN_LENGTH} required)`,
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isPermission = /permission|not authorized|operation not permitted/i.test(errorMessage);

      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'pwpolicy',
          raw: errorMessage,
          message: isPermission
            ? 'Unable to determine password policy due to insufficient permissions. If your device is managed by an MDM, the policy may be enforced at the system level.'
            : 'Unable to determine password policy',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Largest minimum length required by the password content policies,
   * or null when none of them constrains the length.
   */
  private getContentPolicyMinLength(accountPolicies: string): number | null {
    const constraints = [
      ...accountPolicies.matchAll(/policyAttributePassword\s+matches\s+'[^']*\{(\d+),/g),
    ];

    if (constraints.length === 0) {
      return null;
    }

    return Math.max(...constraints.map((match) => parseInt(match[1], 10)));
  }

  /**
   * Minimum length imposed by an MDM Passcode payload, or null when no profile declares one.
   */
  private getProfileMinLength(): number | null {
    try {
      const output = execSync('system_profiler SPConfigurationProfileDataType 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 15000,
      });

      const minLengthMatch = output.match(/minLength\s*[=:]\s*(\d+)/i);

      return minLengthMatch ? parseInt(minLengthMatch[1], 10) : null;
    } catch {
      return null;
    }
  }
}
