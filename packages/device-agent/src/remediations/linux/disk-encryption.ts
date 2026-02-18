import type { RemediationInfo, RemediationResult } from '../../shared/types';
import { getInstructions } from '../instructions';
import type { ComplianceRemediation } from '../types';

/**
 * Linux disk encryption (LUKS) remediation.
 * LUKS encryption must be set up at install time for the root partition;
 * it cannot be enabled on a running system without a full reinstall.
 * This remediation provides guided instructions only.
 */
export class LinuxDiskEncryptionRemediation implements ComplianceRemediation {
  checkType = 'disk_encryption' as const;

  getInfo(): RemediationInfo {
    const { description, steps } = getInstructions('linux', 'disk_encryption');
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
        'LUKS disk encryption must be configured during OS installation. Please follow the guided instructions to reinstall with encryption enabled.',
    };
  }
}
