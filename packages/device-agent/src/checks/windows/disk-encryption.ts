import { execSync } from 'node:child_process';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

/**
 * Checks if BitLocker / Device Encryption is enabled on Windows.
 *
 * If encryption is not available on the system (Windows Home without TPM,
 * or hardware that doesn't support Device Encryption), the check passes
 * with a note — we don't fail users for hardware/edition limitations.
 */
export class WindowsDiskEncryptionCheck implements ComplianceCheck {
  checkType = 'disk_encryption' as const;
  displayName = 'Disk Encryption (BitLocker)';

  async run(): Promise<CheckResult> {
    // First, try to get BitLocker status (works on Pro/Enterprise with BitLocker available)
    const bitlockerResult = this.checkBitLocker();
    if (bitlockerResult !== null) {
      return bitlockerResult;
    }

    // BitLocker commands failed — check if encryption is even available
    const availability = this.checkEncryptionAvailability();

    if (!availability.available) {
      // Encryption is not available on this system — pass with explanation
      return {
        checkType: this.checkType,
        passed: true,
        details: {
          method: 'availability-check',
          raw: JSON.stringify(availability),
          message: `Disk encryption not available: ${availability.reason}. This check is not applicable to your system.`,
          exception: `BitLocker not supported (${availability.reason})`,
        },
        checkedAt: new Date().toISOString(),
      };
    }

    // Encryption should be available but we couldn't determine status
    return {
      checkType: this.checkType,
      passed: false,
      details: {
        method: 'Get-BitLockerVolume + manage-bde',
        raw: 'Commands failed but encryption appears available',
        message: 'Disk encryption is not enabled or could not be detected. Enable BitLocker in Settings. If your device is managed by an MDM (e.g. Intune), try running the agent as Administrator.',
      },
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Tries Get-BitLockerVolume and manage-bde to check encryption status.
   * Returns a CheckResult if status was determined, or null if commands failed.
   */
  private checkBitLocker(): CheckResult | null {
    // Method 1: Get-BitLockerVolume
    try {
      const output = execSync(
        'powershell.exe -NoProfile -NonInteractive -Command "Get-BitLockerVolume -MountPoint C: | Select-Object -Property MountPoint,ProtectionStatus,VolumeStatus,EncryptionPercentage | ConvertTo-Json"',
        { encoding: 'utf-8', timeout: 15000 },
      ).trim();

      const data = JSON.parse(output);
      const protectionStatus = data.ProtectionStatus;
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
    } catch {
      // Fall through to manage-bde
    }

    // Method 2: manage-bde
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
    } catch {
      return null;
    }
  }

  /**
   * Checks whether disk encryption is available on this system.
   * Looks at Windows edition and TPM presence.
   */
  private checkEncryptionAvailability(): { available: boolean; reason: string } {
    const edition = this.getWindowsEdition();
    const hasTpm = this.hasTpm();

    // Windows Home without TPM = no encryption possible
    if (edition === 'home' && !hasTpm) {
      return {
        available: false,
        reason: 'Windows Home edition without TPM — neither BitLocker nor Device Encryption is supported',
      };
    }

    // Windows Home with TPM = Device Encryption might be available
    // but if Get-BitLockerVolume failed, it's likely not supported by the hardware
    if (edition === 'home') {
      return {
        available: false,
        reason: 'Windows Home edition — BitLocker requires Windows Pro. Device Encryption may not be supported by your hardware',
      };
    }

    // Pro/Enterprise without TPM
    if (!hasTpm) {
      return {
        available: false,
        reason: 'No TPM detected — BitLocker requires a TPM 2.0 chip or compatible security device',
      };
    }

    // Pro/Enterprise with TPM — encryption should be available
    return { available: true, reason: '' };
  }

  private getWindowsEdition(): 'home' | 'pro' | 'unknown' {
    try {
      const output = execSync(
        'powershell.exe -NoProfile -NonInteractive -Command "(Get-CimInstance Win32_OperatingSystem).Caption"',
        { encoding: 'utf-8', timeout: 10000 },
      )
        .trim()
        .toLowerCase();

      if (output.includes('home')) return 'home';
      if (output.includes('pro') || output.includes('enterprise') || output.includes('education'))
        return 'pro';
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private hasTpm(): boolean {
    try {
      const output = execSync(
        'powershell.exe -NoProfile -NonInteractive -Command "(Get-Tpm).TpmPresent"',
        { encoding: 'utf-8', timeout: 10000 },
      ).trim();

      return output.toLowerCase() === 'true';
    } catch {
      return false;
    }
  }
}
