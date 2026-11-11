import { readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseScreenOffTime, parseSystemActions } from './cosmic-ron';

/**
 * Resolves the COSMIC settings the screen lock check needs, the way COSMIC itself resolves them.
 *
 * `screen_off_time`: the user file if it exists, else the first system default found in
 * $XDG_DATA_HOME then $XDG_DATA_DIRS (`<dir>/cosmic/...`), else cosmic-idle's built-in 15 minutes.
 * If the file that exists cannot be read or parsed, cosmic-idle logs an error and silently uses
 * its default; this module throws [`CosmicConfigError`] instead of vouching for a value nobody set.
 *   https://github.com/pop-os/libcosmic/blob/ecc5fe4164e1c9024b932382d24ea41f24147e75/cosmic-config/src/lib.rs#L236-L250
 *   https://github.com/pop-os/libcosmic/blob/ecc5fe4164e1c9024b932382d24ea41f24147e75/cosmic-config/src/lib.rs#L423-L460
 *   https://github.com/pop-os/cosmic-idle/blob/6d6f07af60bb307882cdcbd0bda0a6fc76bd0df3/cosmic-idle-config/src/lib.rs#L5-L22
 *   https://github.com/pop-os/cosmic-idle/blob/6d6f07af60bb307882cdcbd0bda0a6fc76bd0df3/src/main.rs#L275-L284
 *
 * `system_actions`: the system map, then the user map merged over it entry by entry. A map that
 * does not parse contributes nothing. With neither, cosmic-idle runs `loginctl lock-session`.
 *   https://github.com/pop-os/cosmic-settings-daemon/blob/a8d9d84cd1c13af510a20dc0f4ab1156c5726515/config/src/shortcuts/mod.rs#L51-L74
 *   https://github.com/pop-os/cosmic-idle/blob/6d6f07af60bb307882cdcbd0bda0a6fc76bd0df3/src/main.rs#L172-L178
 */

/** cosmic-idle's built-in `screen_off_time` when no config file sets one. */
export const COSMIC_DEFAULT_SCREEN_OFF_MS = 15 * 60 * 1000;

/** cosmic-idle's fallback `LockScreen` command when no shortcuts config sets one. */
export const COSMIC_DEFAULT_LOCK_COMMAND = 'loginctl lock-session';

const IDLE_KEY = join('com.system76.CosmicIdle', 'v1', 'screen_off_time');
const SHORTCUTS_KEY = join('com.system76.CosmicSettings.Shortcuts', 'v1', 'system_actions');

export type Env = Record<string, string | undefined>;

export type Provenance = 'user' | 'system' | 'built-in';

export interface CosmicScreenLockSettings {
  /** Milliseconds of inactivity before the screen turns off, or null when it never does. */
  screenOffMs: number | null;
  screenOffSource: Provenance;
  lockCommand: string;
  lockCommandSource: Provenance;
  /** Whether cosmic-idle runs as the current user; null when that cannot be told. */
  idleDaemonRunning: boolean | null;
}

/** A COSMIC setting exists but cannot be read the way COSMIC would read it. */
export class CosmicConfigError extends Error {
  override name = 'CosmicConfigError';
}

/** Reads the settings that decide whether and when COSMIC locks the screen. */
export function readCosmicScreenLock(env: Env = process.env): CosmicScreenLockSettings {
  const userDir = join(configHome(env), 'cosmic');
  const systemDirs = dataDirs(env).map((dir) => join(dir, 'cosmic'));
  return {
    ...readScreenOffTime({ userDir, systemDirs }),
    ...readLockCommand({ userDir, systemDirs }),
    idleDaemonRunning: isProcessRunning({ name: 'cosmic-idle', uid: process.getuid?.() }),
  };
}

interface ConfigDirs {
  userDir: string;
  systemDirs: string[];
}

type ScreenOffTime = Pick<CosmicScreenLockSettings, 'screenOffMs' | 'screenOffSource'>;
type LockCommand = Pick<CosmicScreenLockSettings, 'lockCommand' | 'lockCommandSource'>;

function readScreenOffTime({ userDir, systemDirs }: ConfigDirs): ScreenOffTime {
  const candidates: { path: string; source: Provenance }[] = [
    { path: join(userDir, IDLE_KEY), source: 'user' },
    ...systemDirs.map((dir): { path: string; source: Provenance } => ({
      path: join(dir, IDLE_KEY),
      source: 'system',
    })),
  ];
  for (const { path, source } of candidates) {
    const text = readTextIfExists(path);
    if (text === null) continue;
    const screenOffMs = parseScreenOffTime(text);
    if (screenOffMs === undefined) {
      throw new CosmicConfigError(`${path} does not hold a valid screen_off_time`);
    }
    if (screenOffMs === 0) {
      throw new CosmicConfigError(`${path} sets screen_off_time to 0, which is not an idle delay`);
    }
    return { screenOffMs, screenOffSource: source };
  }
  return { screenOffMs: COSMIC_DEFAULT_SCREEN_OFF_MS, screenOffSource: 'built-in' };
}

function readLockCommand({ userDir, systemDirs }: ConfigDirs): LockCommand {
  let lockCommand = COSMIC_DEFAULT_LOCK_COMMAND;
  let lockCommandSource: Provenance = 'built-in';
  const layers: { text: string | null; source: Provenance }[] = [
    { text: firstExisting(systemDirs.map((dir) => join(dir, SHORTCUTS_KEY))), source: 'system' },
    { text: readTextIfExists(join(userDir, SHORTCUTS_KEY)), source: 'user' },
  ];
  for (const { text, source } of layers) {
    const command = text === null ? undefined : parseSystemActions(text)?.get('LockScreen');
    if (command === undefined) continue;
    lockCommand = command;
    lockCommandSource = source;
  }
  return { lockCommand, lockCommandSource };
}

/** A file's text, null when it does not exist, and [`CosmicConfigError`] for any other failure. */
export function readTextIfExists(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8');
  } catch (error) {
    const code = errorCode(error);
    if (code === 'ENOENT' || code === 'ENOTDIR') return null;
    throw new CosmicConfigError(`${path} exists but could not be read (${code ?? 'error'})`);
  }
}

/**
 * Whether `procRoot` lists a process whose `comm` is exactly `name` and, when `uid` is given,
 * which that user owns. Null when the process list cannot be read.
 */
export function isProcessRunning({
  name,
  uid,
  procRoot = '/proc',
}: {
  name: string;
  uid?: number;
  procRoot?: string;
}): boolean | null {
  let pids: string[];
  try {
    pids = readdirSync(procRoot).filter((entry) => /^\d+$/.test(entry));
  } catch {
    return null;
  }
  return pids.some((pid) => {
    const dir = join(procRoot, pid);
    try {
      return (
        readFileSync(join(dir, 'comm'), 'utf-8').trim() === name &&
        (uid === undefined || statSync(dir).uid === uid)
      );
    } catch {
      return false;
    }
  });
}

function errorCode(error: unknown): string | undefined {
  if (!(error instanceof Error) || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

function firstExisting(paths: string[]): string | null {
  for (const path of paths) {
    const text = readTextIfExists(path);
    if (text !== null) return text;
  }
  return null;
}

function configHome(env: Env): string {
  return env.XDG_CONFIG_HOME || join(env.HOME || homedir(), '.config');
}

/** cosmic-config's system search path: $XDG_DATA_HOME first, then $XDG_DATA_DIRS. */
function dataDirs(env: Env): string[] {
  const dataHome = env.XDG_DATA_HOME || join(env.HOME || homedir(), '.local', 'share');
  const dirs = (env.XDG_DATA_DIRS || '/usr/local/share:/usr/share').split(':').filter(Boolean);
  return [dataHome, ...dirs];
}
