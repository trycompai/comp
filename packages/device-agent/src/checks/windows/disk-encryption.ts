import { execSync } from 'node:child_process';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

/**
 * Checks if BitLocker disk encryption is enabled on Windows.
 * Uses PowerShell's `Get-BitLockerVolume` cmdlet.
 */
export class WindowsDiskEncryptionCheck implements ComplianceCheck {
  checkType = 'disk_encryption' as const;
  displayName = 'Disk Encryption (BitLocker)';

  async run(): Promise<CheckResult> {
    try {
      // Use PowerShell to check BitLocker status on the system drive
      const output = execSync(
        'powershell.exe -NoProfile -NonInteractive -Command "Get-BitLockerVolume -MountPoint C: | Select-Object -Property MountPoint,ProtectionStatus,VolumeStatus,EncryptionPercentage | ConvertTo-Json"',
        { encoding: 'utf-8', timeout: 15000 },
      ).trim();

      const data = JSON.parse(output);
      const protectionStatus = data.ProtectionStatus;

      // ProtectionStatus: 0 = Off, 1 = On, 2 = Unknown
      const isEnabled = protectionStatus === 1;

      return {
        checkType: this.checkType,
        passed: isEnabled,
        details: {
          method: 'Get-BitLockerVolume',
          raw: output.substring(0, 500),
          message: isEnabled
            ? 'BitLocker is enabled on the system drive'
            : 'BitLocker is not enabled on the system drive',
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Try manage-bde as a fallback (doesn't require admin for status check)
      return this.fallbackManageBde();
    }
  }

  private fallbackManageBde(): CheckResult {
    try {
      const output = execSync('manage-bde -status C:', {
        encoding: 'utf-8',
        timeout: 15000,
      }).trim();

      const isEnabled =
        output.toLowerCase().includes('protection on') ||
        output.toLowerCase().includes('fully encrypted');

      return {
        checkType: this.checkType,
        passed: isEnabled,
        details: {
          method: 'manage-bde -status',
          raw: output.substring(0, 500),
          message: isEnabled
            ? 'BitLocker is enabled on the system drive'
            : 'BitLocker is not enabled on the system drive',
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'Get-BitLockerVolume + manage-bde',
          raw: error instanceof Error ? error.message : String(error),
          message: 'Unable to determine BitLocker status',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }
}
