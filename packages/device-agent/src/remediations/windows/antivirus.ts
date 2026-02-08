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
      settingsDeepLink: 'windowsdefender:',
    };
  }

  async remediate(): Promise<RemediationResult> {
    try {
      // First, try to enable Windows Defender real-time protection with admin elevation
      try {
        execSync(
          `powershell.exe -NoProfile -NonInteractive -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -NonInteractive -Command Set-MpPreference -DisableRealtimeMonitoring \\$false' -Wait"`,
          { encoding: 'utf-8', timeout: 60000 },
        );

        return {
          checkType: this.checkType,
          success: true,
          message: 'Windows Defender real-time protection has been enabled',
        };
      } catch {
        // If admin elevation failed or was cancelled, fall back to opening Windows Security
      }

      // Open Windows Security app
      execSync(
        'powershell.exe -NoProfile -NonInteractive -Command "Start-Process windowsdefender:"',
        { encoding: 'utf-8', timeout: 10000 },
      );

      return {
        checkType: this.checkType,
        success: true,
        openedSettings: true,
        message:
          'Opened Windows Security. Ensure real-time protection is enabled under Virus & threat protection.',
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
