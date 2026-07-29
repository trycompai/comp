import type { RemediationInfo, RemediationResult } from '../../shared/types';
import { getInstructions } from '../instructions';
import type { ComplianceRemediation } from '../types';

/**
 * macOS password policy remediation.
 *
 * There is nothing safe to automate: the minimum length macOS enforces lives in the global
 * account policies, and `pwpolicy -setaccountpolicies` *replaces* that whole set, which
 * would drop the built-in FileVault policy and any MDM-imposed ones. The previous
 * `pwpolicy -setglobalpolicy "minChars=8"` wrote the deprecated legacy store instead, which
 * macOS does not enforce — it reported success while the check kept failing.
 * This remediation provides guided instructions only.
 */
export class MacOSPasswordPolicyRemediation implements ComplianceRemediation {
  checkType = 'password_policy' as const;

  getInfo(): RemediationInfo {
    const { description, steps } = getInstructions('macos', 'password_policy');
    return {
      checkType: this.checkType,
      available: true,
      type: 'guide_only',
      requiresAdmin: false,
      description,
      instructions: steps,
    };
  }

  async remediate(): Promise<RemediationResult> {
    return {
      checkType: this.checkType,
      success: false,
      message:
        'A minimum password length has to be enforced by your MDM, or by an administrator setting the global account policies. Please follow the guided instructions.',
    };
  }
}
