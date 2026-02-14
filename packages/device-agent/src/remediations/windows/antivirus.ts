import { execSync } from 'node:child_process';
import type { RemediationInfo, RemediationResult } from '../../shared/types';
import { getInstructions } from '../instructions';
import type { ComplianceRemediation } from '../types';

/**
 * Windows antivirus remediation.
 * Opens Windows Security and optionally attempts to enable
 * Windows Defender real-time protection via admin elevation.
 */
export class WindowsAntivirusRemediation implements ComplianceRemediation {
  checkType = 'antivirus' as const;

  getInfo(): RemediationInfo {
    const { description, steps } = getInstructions('windows', 'antivirus');
    return {
      checkType: this.checkType,
      available: true,
      type: 'open_settings',
      requiresAdmin: false,
      description,
      instructions: steps,
      settingsDeepLink: 'windowsdefender://threat',
    };
  }

  async remediate(): Promise<RemediationResult> {
    try {
      // Open Windows Security > Virus & threat protection directly
      execSync(
        'powershell.exe -NoProfile -NonInteractive -Command "Start-Process windowsdefender://threat"',
        { encoding: 'utf-8', timeout: 10000 },
      );

      return {
        checkType: this.checkType,
        success: true,
        openedSettings: true,
        message:
          'Opened Windows Security. Turn on "Real-time protection" under Virus & threat protection settings.',
      };
    } catch {
      // Fallback to Windows Security main page
      try {
        execSync(
          'powershell.exe -NoProfile -NonInteractive -Command "Start-Process windowsdefender:"',
          { encoding: 'utf-8', timeout: 10000 },
        );

        return {
          checkType: this.checkType,
          success: true,
          openedSettings: true,
          message:
            'Opened Windows Security. Go to Virus & threat protection and ensure real-time protection is on.',
        };
      } catch (error) {
        return {
          checkType: this.checkType,
          success: false,
          message: `Failed to open Windows Security: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }
  }
}
