import { execSync } from 'node:child_process';
import type { RemediationInfo, RemediationResult } from '../../shared/types';
import { getInstructions } from '../instructions';
import type { ComplianceRemediation } from '../types';

/**
 * macOS antivirus remediation.
 * XProtect is built-in and always active on supported macOS versions.
 * If this check is failing, the best remediation is to update macOS.
 * Opens Software Update settings and provides guided instructions.
 */
export class MacOSAntivirusRemediation implements ComplianceRemediation {
  checkType = 'antivirus' as const;

  getInfo(): RemediationInfo {
    const { description, steps } = getInstructions('macos', 'antivirus');
    return {
      checkType: this.checkType,
      available: true,
      type: 'open_settings',
      requiresAdmin: false,
      description,
      instructions: steps,
      settingsDeepLink: 'x-apple.systempreferences:com.apple.Software-Update-Settings.extension',
    };
  }

  async remediate(): Promise<RemediationResult> {
    try {
      // Open Software Update settings
      execSync('open "x-apple.systempreferences:com.apple.Software-Update-Settings.extension"', {
        encoding: 'utf-8',
        timeout: 10000,
      });

      return {
        checkType: this.checkType,
        success: true,
        openedSettings: true,
        message:
          'Opened Software Update settings. Install any available updates to ensure XProtect is current.',
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        success: false,
        message: `Failed to open Software Update settings: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
