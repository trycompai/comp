import { execSync } from 'node:child_process';
import type { RemediationInfo, RemediationResult } from '../../shared/types';
import { getInstructions } from '../instructions';
import type { ComplianceRemediation } from '../types';

/**
 * macOS disk encryption (FileVault) remediation.
 * Opens System Settings to the FileVault pane and provides guided instructions.
 * FileVault cannot be enabled silently — it requires the user's password
 * and generates a recovery key that must be stored.
 */
export class MacOSDiskEncryptionRemediation implements ComplianceRemediation {
  checkType = 'disk_encryption' as const;

  getInfo(): RemediationInfo {
    const { description, steps } = getInstructions('macos', 'disk_encryption');
    return {
      checkType: this.checkType,
      available: true,
      type: 'open_settings',
      requiresAdmin: false,
      description,
      instructions: steps,
      settingsDeepLink: 'x-apple.systempreferences:com.apple.preference.security?FileVault',
    };
  }

  async remediate(): Promise<RemediationResult> {
    try {
      // Open System Settings to the FileVault pane
      execSync('open "x-apple.systempreferences:com.apple.preference.security?FileVault"', {
        encoding: 'utf-8',
        timeout: 10000,
      });

      return {
        checkType: this.checkType,
        success: true,
        openedSettings: true,
        message:
          'Opened FileVault settings. Follow the on-screen instructions to enable FileVault.',
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        success: false,
        message: `Failed to open FileVault settings: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
