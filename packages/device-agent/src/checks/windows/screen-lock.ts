import { execSync } from 'node:child_process';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

const MAX_IDLE_TIME_SECONDS = 300; // 5 minutes

/**
 * Checks if screen lock is enabled and set to 5 minutes or less on Windows.
 *
 * Checks:
 *  1. Screen saver timeout (ScreenSaveTimeOut registry key)
 *  2. Screen saver is secure (ScreenSaverIsSecure registry key)
 *  3. Power settings for display timeout as fallback
 */
export class WindowsScreenLockCheck implements ComplianceCheck {
  checkType = 'screen_lock' as const;
  displayName = 'Screen Lock (5 min or less)';

  async run(): Promise<CheckResult> {
    try {
      const screenSaverTimeout = this.getScreenSaverTimeout();
      const isSecure = this.getScreenSaverIsSecure();

      // Also check power settings as additional signal
      const powerTimeout = this.getPowerDisplayTimeout();

      const screenSaverOk =
        screenSaverTimeout !== null &&
        screenSaverTimeout > 0 &&
        screenSaverTimeout <= MAX_IDLE_TIME_SECONDS &&
        isSecure;

      const powerOk =
        powerTimeout !== null && powerTimeout > 0 && powerTimeout <= MAX_IDLE_TIME_SECONDS;

      // Pass if either screen saver or power settings are properly configured
      const passed = screenSaverOk || (powerOk && isSecure);

      const details: string[] = [];

      if (screenSaverTimeout !== null && screenSaverTimeout > 0) {
        details.push(`Screen saver timeout: ${screenSaverTimeout} seconds`);
      } else {
        details.push('Screen saver timeout not configured');
      }

      details.push(isSecure ? 'Password on resume: enabled' : 'Password on resume: disabled');

      if (powerTimeout !== null) {
        details.push(`Display power timeout: ${powerTimeout} seconds`);
      }

      return {
        checkType: this.checkType,
        passed,
        details: {
          method: 'registry + powercfg',
          raw: JSON.stringify({ screenSaverTimeout, isSecure, powerTimeout }),
          message: details.join('. '),
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'registry',
          raw: error instanceof Error ? error.message : String(error),
          message: 'Unable to determine screen lock settings',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private getScreenSaverTimeout(): number | null {
    try {
      const output = execSync(
        'powershell.exe -NoProfile -NonInteractive -Command "(Get-ItemProperty -Path \'HKCU:\\Control Panel\\Desktop\' -Name ScreenSaveTimeOut -ErrorAction SilentlyContinue).ScreenSaveTimeOut"',
        { encoding: 'utf-8', timeout: 10000 },
      ).trim();

      const value = parseInt(output, 10);
      return isNaN(value) ? null : value;
    } catch {
      return null;
    }
  }

  private getScreenSaverIsSecure(): boolean {
    try {
      const output = execSync(
        'powershell.exe -NoProfile -NonInteractive -Command "(Get-ItemProperty -Path \'HKCU:\\Control Panel\\Desktop\' -Name ScreenSaverIsSecure -ErrorAction SilentlyContinue).ScreenSaverIsSecure"',
        { encoding: 'utf-8', timeout: 10000 },
      ).trim();

      return output === '1';
    } catch {
      return false;
    }
  }

  /**
   * Gets the display power timeout in seconds using powercfg.
   * This is the "Turn off display" timeout from power settings.
   */
  private getPowerDisplayTimeout(): number | null {
    try {
      const output = execSync(
        'powershell.exe -NoProfile -NonInteractive -Command "powercfg /query SCHEME_CURRENT SUB_VIDEO VIDEOIDLE | Select-String \'Current AC Power Setting Index\'"',
        { encoding: 'utf-8', timeout: 10000 },
      ).trim();

      // Output format: "Current AC Power Setting Index: 0x0000012c"
      const hexMatch = output.match(/0x([0-9a-fA-F]+)/);
      if (hexMatch) {
        return parseInt(hexMatch[1], 16);
      }

      return null;
    } catch {
      return null;
    }
  }
}
