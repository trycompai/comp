import { execSync } from 'node:child_process';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

const MAX_IDLE_TIME_SECONDS = 300; // 5 minutes

/**
 * Checks if screen lock is enabled and set to 5 minutes or less on Linux.
 *
 * Detection methods:
 *  1. GNOME: gsettings for org.gnome.desktop.session idle-delay and
 *     org.gnome.desktop.screensaver lock-enabled
 *  2. KDE: kreadconfig5 for the screen locker timeout
 *  3. xdg-screensaver as a generic fallback
 */
export class LinuxScreenLockCheck implements ComplianceCheck {
  checkType = 'screen_lock' as const;
  displayName = 'Screen Lock (5 min or less)';

  async run(): Promise<CheckResult> {
    try {
      // Try GNOME first (most common desktop environment)
      const gnomeResult = this.checkGnome();
      if (gnomeResult !== null) {
        return gnomeResult;
      }

      // Try KDE Plasma
      const kdeResult = this.checkKDE();
      if (kdeResult !== null) {
        return kdeResult;
      }

      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'gsettings + kreadconfig5',
          raw: 'No supported desktop environment detected',
          message: 'Unable to determine screen lock settings (unsupported desktop environment)',
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'gsettings',
          raw: error instanceof Error ? error.message : String(error),
          message: 'Unable to determine screen lock settings',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private checkGnome(): CheckResult | null {
    try {
      // Check idle delay (in seconds; 0 means disabled)
      const idleDelayOutput = execSync(
        'gsettings get org.gnome.desktop.session idle-delay 2>/dev/null',
        { encoding: 'utf-8', timeout: 5000 },
      ).trim();

      // Output format: "uint32 300" or "300"
      const idleMatch = idleDelayOutput.match(/(\d+)/);
      if (!idleMatch) return null;

      const idleDelay = parseInt(idleMatch[1], 10);

      // Check if screen lock is enabled
      const lockEnabledOutput = execSync(
        'gsettings get org.gnome.desktop.screensaver lock-enabled 2>/dev/null',
        { encoding: 'utf-8', timeout: 5000 },
      ).trim();

      const lockEnabled = lockEnabledOutput === 'true';
      const idleOk = idleDelay > 0 && idleDelay <= MAX_IDLE_TIME_SECONDS;
      const passed = idleOk && lockEnabled;

      let message: string;
      if (passed) {
        message = `Screen saver activates after ${idleDelay} seconds with a password required`;
      } else if (idleDelay === 0) {
        message = 'Screen saver idle time is disabled';
      } else if (!lockEnabled) {
        message = `Screen saver activates after ${idleDelay} seconds but screen lock is disabled`;
      } else {
        message = `Screen saver activates after ${idleDelay} seconds (must be ${MAX_IDLE_TIME_SECONDS} or less)`;
      }

      return {
        checkType: this.checkType,
        passed,
        details: {
          method: 'gsettings (GNOME)',
          raw: JSON.stringify({ idleDelay, lockEnabled }),
          message,
        },
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private checkKDE(): CheckResult | null {
    try {
      // KDE Plasma screen locker timeout (in seconds)
      const timeoutOutput = execSync(
        'kreadconfig5 --group Daemon --key Timeout --file kscreenlockerrc 2>/dev/null',
        { encoding: 'utf-8', timeout: 5000 },
      ).trim();

      const timeout = parseInt(timeoutOutput, 10);
      if (isNaN(timeout)) return null;

      // Check if autolock is enabled
      const autolockOutput = execSync(
        'kreadconfig5 --group Daemon --key Autolock --file kscreenlockerrc 2>/dev/null',
        { encoding: 'utf-8', timeout: 5000 },
      ).trim();

      const autolock = autolockOutput.toLowerCase() !== 'false';
      // KDE timeout is in minutes
      const timeoutSeconds = timeout * 60;
      const idleOk = timeoutSeconds > 0 && timeoutSeconds <= MAX_IDLE_TIME_SECONDS;
      const passed = idleOk && autolock;

      let message: string;
      if (passed) {
        message = `Screen locks after ${timeout} minutes with autolock enabled`;
      } else if (!autolock) {
        message = 'Screen lock autolock is disabled';
      } else {
        message = `Screen locks after ${timeout} minutes (must be ${MAX_IDLE_TIME_SECONDS / 60} minutes or less)`;
      }

      return {
        checkType: this.checkType,
        passed,
        details: {
          method: 'kreadconfig5 (KDE)',
          raw: JSON.stringify({ timeout, autolock }),
          message,
        },
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}
