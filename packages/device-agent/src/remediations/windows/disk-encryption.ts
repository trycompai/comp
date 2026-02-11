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
      settingsDeepLink: 'ms-settings:about',
    };
  }

  async remediate(): Promise<RemediationResult> {
    try {
      // Try to open the BitLocker control panel directly
      try {
        execSync('control /name Microsoft.BitLockerDriveEncryption', {
          encoding: 'utf-8',
          timeout: 10000,
        });
      } catch {
        // Fallback to Settings > Device encryption
        execSync(
          'powershell.exe -NoProfile -NonInteractive -Command "Start-Process ms-settings:about"',
          {
            encoding: 'utf-8',
            timeout: 10000,
          },
        );
      }

      return {
        checkType: this.checkType,
        success: true,
        openedSettings: true,
        message:
          'Opened BitLocker settings. Follow the on-screen instructions to enable disk encryption.',
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        success: false,
        message: `Failed to open BitLocker settings: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
