import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeProcess {
  comm: string;
  uid: number;
}

const fakeFs = vi.hoisted(() => {
  const errno = (code: string) => Object.assign(new Error(code), { code });
  return {
    errno,
    files: new Map<string, string>(),
    unreadable: new Map<string, string>(),
    processes: new Map<string, FakeProcess>(),
    procListable: true,
  };
});

vi.mock('node:fs', () => ({
  readFileSync: (path: string) => {
    const code = fakeFs.unreadable.get(path);
    if (code) throw fakeFs.errno(code);
    const proc = /^\/proc\/(\d+)\/comm$/.exec(path);
    const text = proc ? fakeFs.processes.get(proc[1])?.comm : fakeFs.files.get(path);
    if (text === undefined) throw fakeFs.errno('ENOENT');
    return proc ? `${text}\n` : text;
  },
  readdirSync: (path: string) => {
    if (path !== '/proc' || !fakeFs.procListable) throw fakeFs.errno('EACCES');
    return ['self', 'sys', ...fakeFs.processes.keys()];
  },
  statSync: (path: string) => {
    const proc = fakeFs.processes.get(path.replace('/proc/', ''));
    if (!proc) throw fakeFs.errno('ENOENT');
    return { uid: proc.uid };
  },
}));

import {
  CosmicConfigError,
  isProcessRunning,
  readCosmicScreenLock,
  readTextIfExists,
} from './cosmic-config';

const ENV = { HOME: '/home/u', XDG_DATA_DIRS: '/usr/local/share:/usr/share' };
const USER_IDLE = '/home/u/.config/cosmic/com.system76.CosmicIdle/v1/screen_off_time';
const SYSTEM_IDLE = '/usr/share/cosmic/com.system76.CosmicIdle/v1/screen_off_time';
const LOCAL_SYSTEM_IDLE = '/usr/local/share/cosmic/com.system76.CosmicIdle/v1/screen_off_time';
const USER_ACTIONS =
  '/home/u/.config/cosmic/com.system76.CosmicSettings.Shortcuts/v1/system_actions';
const SYSTEM_ACTIONS = '/usr/share/cosmic/com.system76.CosmicSettings.Shortcuts/v1/system_actions';
const SHIPPED_ACTIONS = '{ AppLibrary: "cosmic-app-library", LockScreen: "loginctl lock-session" }';
const UID = process.getuid?.() ?? 1000;

function givenFiles(files: Record<string, string>) {
  for (const [path, text] of Object.entries(files)) fakeFs.files.set(path, text);
}

beforeEach(() => {
  fakeFs.files.clear();
  fakeFs.unreadable.clear();
  fakeFs.processes.clear();
  fakeFs.procListable = true;
  fakeFs.processes.set('4242', { comm: 'cosmic-idle', uid: UID });
});

describe('readCosmicScreenLock', () => {
  it('uses the built-in defaults when nothing is configured', () => {
    expect(readCosmicScreenLock(ENV)).toEqual({
      screenOffMs: 900000,
      screenOffSource: 'built-in',
      lockCommand: 'loginctl lock-session',
      lockCommandSource: 'built-in',
      idleDaemonRunning: true,
    });
  });

  it('prefers the user screen_off_time over the system default', () => {
    givenFiles({ [USER_IDLE]: 'Some(300000)', [SYSTEM_IDLE]: 'Some(1800000)' });
    expect(readCosmicScreenLock(ENV)).toMatchObject({
      screenOffMs: 300000,
      screenOffSource: 'user',
    });
  });

  it('takes the first system default in XDG_DATA_DIRS order', () => {
    givenFiles({ [LOCAL_SYSTEM_IDLE]: 'Some(120000)', [SYSTEM_IDLE]: 'None' });
    expect(readCosmicScreenLock(ENV)).toMatchObject({
      screenOffMs: 120000,
      screenOffSource: 'system',
    });
  });

  it('honours XDG_CONFIG_HOME and XDG_DATA_HOME', () => {
    givenFiles({
      '/cfg/cosmic/com.system76.CosmicIdle/v1/screen_off_time': 'Some(120000)',
      '/data/cosmic/com.system76.CosmicSettings.Shortcuts/v1/system_actions': SHIPPED_ACTIONS,
    });
    const env = { ...ENV, XDG_CONFIG_HOME: '/cfg', XDG_DATA_HOME: '/data' };
    expect(readCosmicScreenLock(env)).toMatchObject({
      screenOffMs: 120000,
      lockCommandSource: 'system',
    });
  });

  it.each([
    ['does not parse', '900000'],
    ['sets a zero delay', 'Some(0)'],
  ])('refuses to guess when the screen_off_time file that exists %s', (_, text) => {
    givenFiles({ [USER_IDLE]: text, [SYSTEM_IDLE]: 'Some(60000)' });
    expect(() => readCosmicScreenLock(ENV)).toThrow(CosmicConfigError);
  });

  it('refuses to guess when the screen_off_time file exists but cannot be read', () => {
    fakeFs.unreadable.set(USER_IDLE, 'EACCES');
    givenFiles({ [SYSTEM_IDLE]: 'Some(60000)' });
    expect(() => readCosmicScreenLock(ENV)).toThrow(/could not be read \(EACCES\)/);
  });

  it('merges the user LockScreen over the system one, entry by entry', () => {
    givenFiles({ [SYSTEM_ACTIONS]: SHIPPED_ACTIONS, [USER_ACTIONS]: '{ LockScreen: "swaylock" }' });
    expect(readCosmicScreenLock(ENV)).toMatchObject({
      lockCommand: 'swaylock',
      lockCommandSource: 'user',
    });
  });

  it('keeps the system LockScreen when the user map does not set it', () => {
    givenFiles({ [SYSTEM_ACTIONS]: SHIPPED_ACTIONS, [USER_ACTIONS]: '{ Terminal: "foot" }' });
    expect(readCosmicScreenLock(ENV)).toMatchObject({
      lockCommand: 'loginctl lock-session',
      lockCommandSource: 'system',
    });
  });

  it('ignores a user map COSMIC cannot parse, keeping the system entries', () => {
    givenFiles({
      [SYSTEM_ACTIONS]: SHIPPED_ACTIONS,
      [USER_ACTIONS]: '{ LockScreen: "swaylock", Suspend: 1 }',
    });
    expect(readCosmicScreenLock(ENV)).toMatchObject({ lockCommandSource: 'system' });
  });
});

describe('isProcessRunning', () => {
  it('finds a process by exact comm owned by the given user', () => {
    expect(isProcessRunning({ name: 'cosmic-idle', uid: UID })).toBe(true);
  });

  it('ignores near-miss names and processes owned by another user', () => {
    fakeFs.processes.clear();
    fakeFs.processes.set('10', { comm: 'cosmic-idle-x', uid: UID });
    fakeFs.processes.set('11', { comm: 'cosmic-idle', uid: UID + 1 });
    expect(isProcessRunning({ name: 'cosmic-idle', uid: UID })).toBe(false);
  });

  it('returns null when the process list cannot be read', () => {
    fakeFs.procListable = false;
    expect(isProcessRunning({ name: 'cosmic-idle', uid: UID })).toBeNull();
  });
});

describe('readTextIfExists', () => {
  it('returns text, null for a missing path, and throws for a path it cannot read', () => {
    givenFiles({ '/f': 'Some(1)' });
    fakeFs.unreadable.set('/dir', 'EISDIR');
    fakeFs.unreadable.set('/f/below', 'ENOTDIR');
    expect(readTextIfExists('/f')).toBe('Some(1)');
    expect(readTextIfExists('/missing')).toBeNull();
    expect(readTextIfExists('/f/below')).toBeNull();
    expect(() => readTextIfExists('/dir')).toThrow(CosmicConfigError);
  });
});
