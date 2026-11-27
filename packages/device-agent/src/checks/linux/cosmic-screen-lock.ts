import type { CheckResult } from '../../shared/types';
import {
  COSMIC_DEFAULT_LOCK_COMMAND,
  CosmicConfigError,
  type CosmicScreenLockSettings,
  type Env,
  readCosmicScreenLock,
} from './cosmic-config';

/**
 * Screen lock on the COSMIC desktop (System76; Pop!_OS 24.04+, also packaged for Arch and Fedora).
 *
 * COSMIC has no gsettings/dconf schema for idle locking. Its idle daemon, `cosmic-idle`, starts a
 * 5 s fade to black after `screen_off_time` ms of inactivity, powers the outputs off when the fade
 * ends, and 500 ms later runs the `LockScreen` system action (`loginctl lock-session` by default,
 * which `cosmic-greeter` answers with the lock screen). The session therefore locks
 * `screen_off_time + 5.5 s` after the last input, and that is the delay compared with the limit.
 *   https://github.com/pop-os/cosmic-idle/blob/6d6f07af60bb307882cdcbd0bda0a6fc76bd0df3/src/main.rs#L155-L178
 *   https://github.com/pop-os/cosmic-idle/blob/6d6f07af60bb307882cdcbd0bda0a6fc76bd0df3/src/fade_black.rs#L17
 *
 * The settings page offers 2, 5, 10, 15 and 30 minutes, so 10 is the largest choice that passes.
 *   https://github.com/pop-os/cosmic-settings/blob/6aaf30d69ec3ed64eeb1d441ef5fe0a2017b3fe6/cosmic-settings/src/pages/power/mod.rs#L23-L29
 */

export const MAX_LOCK_DELAY_MS = 15 * 60 * 1000;

/** cosmic-idle `FADE_TIME` plus `LOCK_SCREEN_DELAY`: time from idle timeout to the lock command. */
export const COSMIC_FADE_AND_LOCK_DELAY_MS = 5000 + 500;

/** check-in rejects a `details.raw` over 2000 characters, which would stop the device reporting. */
const MAX_COMMAND_LENGTH = 200;

const METHOD = 'cosmic-config (COSMIC)';
const DESKTOP_VARIABLES = ['XDG_CURRENT_DESKTOP', 'XDG_SESSION_DESKTOP', 'DESKTOP_SESSION'];

/** True when the first desktop variable that is set names COSMIC (e.g. `COSMIC`, `pop:COSMIC`). */
export function isCosmicSession(env: Env = process.env): boolean {
  const value = DESKTOP_VARIABLES.map((variable) => env[variable]).find(Boolean);
  if (!value) return false;
  return value
    .toLowerCase()
    .split(':')
    .some((entry) => entry.trim() === 'cosmic');
}

/** Runs the COSMIC screen lock check; config COSMIC itself could not read is undetermined. */
export function checkCosmicScreenLock(env: Env = process.env): CheckResult {
  try {
    return evaluateCosmicScreenLock(readCosmicScreenLock(env));
  } catch (error) {
    if (!(error instanceof CosmicConfigError)) throw error;
    return {
      checkType: 'screen_lock',
      passed: false,
      details: {
        method: METHOD,
        raw: error.message,
        message: `Unable to determine screen lock settings: ${error.message}`,
        exception: 'COSMIC screen lock settings could not be read',
      },
      checkedAt: new Date().toISOString(),
    };
  }
}

/** Turns resolved settings into a `screen_lock` result. */
export function evaluateCosmicScreenLock(settings: CosmicScreenLockSettings): CheckResult {
  const lockDelayMs =
    settings.screenOffMs === null ? null : settings.screenOffMs + COSMIC_FADE_AND_LOCK_DELAY_MS;
  const raw = JSON.stringify({
    ...settings,
    lockCommand: settings.lockCommand.slice(0, MAX_COMMAND_LENGTH),
    lockDelayMs,
  });
  const result = ({ passed, message }: { passed: boolean; message: string }): CheckResult => ({
    checkType: 'screen_lock',
    passed,
    details: { method: METHOD, raw, message },
    checkedAt: new Date().toISOString(),
  });

  if (settings.idleDaemonRunning === false) {
    return result({
      passed: false,
      message:
        'The COSMIC idle service (cosmic-idle) is not running, so the screen never locks automatically',
    });
  }
  if (settings.idleDaemonRunning === null) {
    return result({
      passed: false,
      message: 'Could not confirm the COSMIC idle service (cosmic-idle) is running',
    });
  }
  if (settings.screenOffMs === null || lockDelayMs === null) {
    return result({
      passed: false,
      message: 'Screen never turns off when idle, so COSMIC never locks it automatically',
    });
  }
  const command = settings.lockCommand.trim();
  if (command === '') {
    return result({ passed: false, message: 'The COSMIC lock screen action is disabled' });
  }
  if (command !== COSMIC_DEFAULT_LOCK_COMMAND) {
    return result({
      passed: false,
      message:
        `The COSMIC lock screen action is a custom command ("${command.slice(0, MAX_COMMAND_LENGTH)}"), ` +
        'so Comp AI cannot confirm it locks the session',
    });
  }
  const screenOff = formatDuration(settings.screenOffMs);
  const lockAfter = formatDuration(lockDelayMs);
  if (lockDelayMs > MAX_LOCK_DELAY_MS) {
    return result({
      passed: false,
      message:
        `Screen locks ${lockAfter} after the last input (screen off at ${screenOff}, then a ` +
        '5.5 second fade and lock); it must lock within 15 minutes. In Settings > Power & ' +
        'Battery, set "Turn off the screen after" to 10 minutes or less',
    });
  }
  return result({
    passed: true,
    message: `Screen locks ${lockAfter} after the last input (screen off at ${screenOff})`,
  });
}

function formatDuration(ms: number): string {
  const tenths = Math.round(ms / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = (tenths % 600) / 10;
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  if (seconds > 0 || minutes === 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
  return parts.join(' ');
}
