import { execSync } from 'node:child_process';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

const MAX_IDLE_TIME_SECONDS = 300; // 5 minutes

/**
 * Checks if screen lock is enabled and set to 5 minutes or less on macOS.
 *
 * Checks two settings:
 *  1. Screen saver idle time (how long before screen saver activates)
 *  2. Whether a password is required after screen saver / sleep
 *
 * On modern macOS (Ventura+), `sysadminctl -screenLock status` reports the
 * screen lock delay. If a delay is reported, screen lock is enabled.
 *
 * On MDM-managed machines, the screen saver idle time may not be available
 * via `defaults read`. In that case, if `sysadminctl` confirms screen lock
 * is enabled with an acceptable delay, the check passes.
 */
export class MacOSScreenLockCheck implements ComplianceCheck {
  checkType = 'screen_lock' as const;
  displayName = 'Screen Lock (5 min or less)';

  async run(): Promise<CheckResult> {
    try {
      const idleTime = this.getScreenSaverIdleTime();
      const { requiresPassword, screenLockDelay } = this.getPasswordRequirement();

      const idleTimeOk = idleTime !== null && idleTime > 0 && idleTime <= MAX_IDLE_TIME_SECONDS;

      // On MDM-managed machines, sysadminctl may report screen lock is active
      // even when com.apple.screensaver idleTime is not set via defaults.
      // If sysadminctl confirms screen lock with an acceptable delay, that's sufficient.
      const sysadminctlOk =
        requiresPassword && screenLockDelay !== null && screenLockDelay <= MAX_IDLE_TIME_SECONDS;

      const passed = (idleTimeOk && requiresPassword) || sysadminctlOk;

      let message: string;

      if (passed && sysadminctlOk && !idleTimeOk) {
        message =
          screenLockDelay === 0
            ? 'Screen lock is enforced with immediate password requirement'
            : `Screen lock is enforced with ${screenLockDelay} second delay`;
      } else if (idleTime === null || idleTime === 0) {
        if (requiresPassword && screenLockDelay !== null) {
          message = `Screen lock requires password but idle time exceeds ${MAX_IDLE_TIME_SECONDS} seconds`;
        } else {
          message = 'Screen saver idle time is not configured';
        }
      } else if (passed) {
        message = `Screen saver activates after ${idleTime} seconds with a password required`;
      } else if (idleTime > MAX_IDLE_TIME_SECONDS) {
        message = `Screen saver activates after ${idleTime} seconds (must be ${MAX_IDLE_TIME_SECONDS} or less)`;
      } else if (!requiresPassword) {
        message = `Screen saver activates after ${idleTime} seconds but no password is required`;
      } else {
        message = `Screen saver activates after ${idleTime} seconds`;
      }

      return {
        checkType: this.checkType,
        passed,
        details: {
          method: 'defaults-read + sysadminctl',
          raw: JSON.stringify({ idleTime, requiresPassword, screenLockDelay }),
          message,
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isPermission = /permission|not authorized|operation not permitted/i.test(errorMessage);

      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'defaults-read',
          raw: errorMessage,
          message: isPermission
            ? 'Unable to determine screen lock settings due to insufficient permissions. If your device is managed by an MDM, screen lock may be enforced at the system level.'
            : 'Unable to determine screen lock settings',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Gets the screen saver idle time in seconds.
   * Returns null if not set.
   */
  private getScreenSaverIdleTime(): number | null {
    try {
      const output = execSync(
        'defaults -currentHost read com.apple.screensaver idleTime 2>/dev/null',
        { encoding: 'utf-8', timeout: 5000 },
      ).trim();

      const time = parseInt(output, 10);
      return isNaN(time) ? null : time;
    } catch {
      try {
        const output = execSync('defaults read com.apple.screensaver idleTime 2>/dev/null', {
          encoding: 'utf-8',
          timeout: 5000,
        }).trim();

        const time = parseInt(output, 10);
        return isNaN(time) ? null : time;
      } catch {
        return null;
      }
    }
  }

  /**
   * Checks if a password is required after screen saver or sleep.
   * Uses multiple detection methods for different macOS versions.
   */
  private getPasswordRequirement(): { requiresPassword: boolean; screenLockDelay: number | null } {
    // Method 1: sysadminctl (macOS Ventura+)
    // Output format: "screenLock delay is 300 seconds", "screenLock delay is immediate", or "screenLock is off"
    try {
      const output = execSync('sysadminctl -screenLock status 2>&1', {
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();

      // If it reports a numeric delay, screen lock is enabled
      const delayMatch = output.match(/screenLock\s+delay\s+is\s+(\d+)/i);
      if (delayMatch) {
        return {
          requiresPassword: true,
          screenLockDelay: parseInt(delayMatch[1], 10),
        };
      }

      // "screenLock delay is immediate" means password required immediately (MDM-managed)
      if (output.toLowerCase().includes('delay is immediate')) {
        return { requiresPassword: true, screenLockDelay: 0 };
      }

      // "screenLock is on" also means enabled
      if (
        output.toLowerCase().includes('screenlock is on') ||
        output.toLowerCase().includes('screensaver is on')
      ) {
        return { requiresPassword: true, screenLockDelay: 0 };
      }

      // "screenLock is off" means disabled
      if (output.toLowerCase().includes('is off')) {
        return { requiresPassword: false, screenLockDelay: null };
      }
    } catch {
      // sysadminctl not available
    }

    // Method 2: defaults read askForPassword (older macOS)
    try {
      const output = execSync('defaults read com.apple.screensaver askForPassword 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();

      return {
        requiresPassword: output === '1',
        screenLockDelay: null,
      };
    } catch {
      // Key doesn't exist
    }

    // Method 3: Check if "require password immediately" is set via system prefs
    try {
      const output = execSync(
        'defaults -currentHost read com.apple.screensaver askForPassword 2>/dev/null',
        { encoding: 'utf-8', timeout: 5000 },
      ).trim();

      return {
        requiresPassword: output === '1',
        screenLockDelay: null,
      };
    } catch {
      // Not found
    }

    return { requiresPassword: false, screenLockDelay: null };
  }
}
