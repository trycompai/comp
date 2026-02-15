import type { RemediationInfo, RemediationResult } from '../../shared/types';
import { getInstructions } from '../instructions';
import type { ComplianceRemediation } from '../types';

/**
 * Linux antivirus remediation.
 * Provides guided instructions to install ClamAV or enterprise AV software.
 * Also provides guidance on enabling AppArmor/SELinux.
 */
export class LinuxAntivirusRemediation implements ComplianceRemediation {
  checkType = 'antivirus' as const;

  getInfo(): RemediationInfo {
    const { description, steps } = getInstructions('linux', 'antivirus');
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
        'Please install antivirus software manually. Follow the guided instructions for ClamAV installation or enterprise AV setup.',
    };
  }
}
