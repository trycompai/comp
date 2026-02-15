import { execSync } from 'node:child_process';
import type { RemediationInfo, RemediationResult } from '../../shared/types';
import { getInstructions } from '../instructions';
import type { ComplianceRemediation } from '../types';

const TARGET_IDLE_TIME_SECONDS = 300; // 5 minutes

/**
 * Windows screen lock remediation.
 * Auto-fixes without admin privileges by writing user-level HKCU registry keys:
 *  - ScreenSaveTimeOut = 300 (5 minutes)
 *  - ScreenSaverIsSecure = 1 (password required on resume)
 *  - ScreenSaveActive = 1 (screen saver enabled)
 */
export class WindowsScreenLockRemediation implements ComplianceRemediation {
  checkType = 'screen_lock' as const;

  getInfo(): RemediationInfo {
    const { description, steps } = getInstructions('windows', 'screen_lock');
    return {
      checkType: this.checkType,
      available: true,
      type: 'auto_fix',
      requiresAdmin: false,
      description,
      instructions: steps,
    };
  }

  async remediate(): Promise<RemediationResult> {
    try {
      const regPath = 'HKCU:\\Control Panel\\Desktop';

      // Enable screen saver
      execSync(
        `powershell.exe -NoProfile -NonInteractive -Command "Set-ItemProperty -Path '${regPath}' -Name ScreenSaveActive -Value '1'"`,
        { encoding: 'utf-8', timeout: 10000 },
      );

      // Set timeout to 5 minutes
      execSync(
        `powershell.exe -NoProfile -NonInteractive -Command "Set-ItemProperty -Path '${regPath}' -Name ScreenSaveTimeOut -Value '${TARGET_IDLE_TIME_SECONDS}'"`,
        { encoding: 'utf-8', timeout: 10000 },
      );

      // Require password on resume
      execSync(
        `powershell.exe -NoProfile -NonInteractive -Command "Set-ItemProperty -Path '${regPath}' -Name ScreenSaverIsSecure -Value '1'"`,
        { encoding: 'utf-8', timeout: 10000 },
      );

      return {
        checkType: this.checkType,
        success: true,
        message: `Screen lock configured: ${TARGET_IDLE_TIME_SECONDS / 60}-minute timeout with password on resume`,
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        success: false,
        message: `Failed to configure screen lock: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
