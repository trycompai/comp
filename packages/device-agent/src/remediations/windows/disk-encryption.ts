import { execSync } from 'node:child_process';
import type { RemediationInfo, RemediationResult } from '../../shared/types';
import { getInstructions } from '../instructions';
import type { ComplianceRemediation } from '../types';

/**
 * Windows disk encryption (BitLocker) remediation.
 * Opens the BitLocker control panel and provides guided instructions.
 * BitLocker cannot be enabled silently — it requires admin privileges,
 * TPM, recovery key handling, and potentially a reboot.
 */
export class WindowsDiskEncryptionRemediation implements ComplianceRemediation {
  checkType = 'disk_encryption' as const;

  getInfo(): RemediationInfo {
    const { description, steps } = getInstructions('windows', 'disk_encryption');
    return {
      checkType: this.checkType,
      available: true,
      type: 'open_settings',
      requiresAdmin: false,
      description,
      instructions: steps,
      settingsDeepLink: 'ms-settings:deviceencryption',
    };
  }

  async remediate(): Promise<RemediationResult> {
    // Try multiple paths since availability depends on Windows edition and hardware
    const attempts = [
      {
        cmd: 'powershell.exe -NoProfile -NonInteractive -Command "Start-Process ms-settings:deviceencryption"',
        msg: 'Opened Device encryption settings. Turn on "Device encryption" if available.',
      },
      {
        cmd: 'control /name Microsoft.BitLockerDriveEncryption',
        msg: 'Opened BitLocker Drive Encryption. Click "Turn on BitLocker" for the C: drive.',
      },
      {
        cmd: 'powershell.exe -NoProfile -NonInteractive -Command "Start-Process ms-settings:about"',
        msg: 'Opened System About page. Check your Windows edition — Windows 11 Pro is required for BitLocker, or your hardware must support Device encryption (TPM 2.0 + Secure Boot).',
      },
    ];

    for (const attempt of attempts) {
      try {
        execSync(attempt.cmd, { encoding: 'utf-8', timeout: 10000 });
        return {
          checkType: this.checkType,
          success: true,
          openedSettings: true,
          message: attempt.msg,
        };
      } catch {
        continue;
      }
    }

    return {
      checkType: this.checkType,
      success: false,
      message:
        'Could not open encryption settings. Search for "Device encryption" or "Manage BitLocker" in the Start menu.',
    };
  }
}
