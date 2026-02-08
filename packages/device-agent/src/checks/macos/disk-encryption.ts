import { execSync } from 'node:child_process';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

/**
 * Checks if FileVault disk encryption is enabled on macOS.
 * Uses the `fdesetup status` command.
 */
export class MacOSDiskEncryptionCheck implements ComplianceCheck {
  checkType = 'disk_encryption' as const;
  displayName = 'Disk Encryption (FileVault)';

  async run(): Promise<CheckResult> {
    try {
      const output = execSync('fdesetup status', {
        encoding: 'utf-8',
        timeout: 10000,
      }).trim();

      const isEnabled = output.toLowerCase().includes('filevault is on');

      return {
        checkType: this.checkType,
        passed: isEnabled,
        details: {
          method: 'fdesetup status',
          raw: output,
          message: isEnabled ? 'FileVault is enabled' : 'FileVault is not enabled',
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'fdesetup status',
          raw: errorMessage,
          message: 'Unable to determine FileVault status',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }
}
