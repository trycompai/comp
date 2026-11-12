import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CosmicScreenLockSettings } from './cosmic-config';

const readCosmicScreenLockMock = vi.fn();

vi.mock('./cosmic-config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./cosmic-config')>()),
  readCosmicScreenLock: () => readCosmicScreenLockMock(),
}));

import { CosmicConfigError } from './cosmic-config';
import {
  checkCosmicScreenLock,
  evaluateCosmicScreenLock,
  isCosmicSession,
} from './cosmic-screen-lock';

/** A stock install with cosmic-idle running, overridden per test. */
function settings(overrides: Partial<CosmicScreenLockSettings> = {}): CosmicScreenLockSettings {
  return {
    screenOffMs: 900000,
    screenOffSource: 'built-in',
    lockCommand: 'loginctl lock-session',
    lockCommandSource: 'system',
    idleDaemonRunning: true,
    ...overrides,
  };
}

describe('isCosmicSession', () => {
  it('matches COSMIC in the first desktop variable that is set', () => {
    expect(isCosmicSession({ XDG_CURRENT_DESKTOP: 'COSMIC' })).toBe(true);
    expect(isCosmicSession({ XDG_CURRENT_DESKTOP: 'pop:COSMIC' })).toBe(true);
    expect(isCosmicSession({ XDG_SESSION_DESKTOP: 'cosmic' })).toBe(true);
  });

  it('does not match other desktops, substrings, or a later variable', () => {
    expect(isCosmicSession({ XDG_CURRENT_DESKTOP: 'GNOME' })).toBe(false);
    expect(isCosmicSession({ XDG_CURRENT_DESKTOP: 'cosmicish' })).toBe(false);
    expect(isCosmicSession({ XDG_CURRENT_DESKTOP: 'GNOME', XDG_SESSION_DESKTOP: 'cosmic' })).toBe(
      false,
    );
    expect(isCosmicSession({})).toBe(false);
  });
});

describe('evaluateCosmicScreenLock', () => {
  it('fails a stock install: 15 minute screen off locks at 15 minutes 5.5 seconds', () => {
    const result = evaluateCosmicScreenLock(settings());
    expect(result.passed).toBe(false);
    expect(result.details.message).toContain('locks 15 minutes 5.5 seconds after the last input');
    expect(result.details.message).toContain('10 minutes or less');
  });

  it('passes the largest settings-page choice under the limit, 10 minutes', () => {
    const tenMinutes = settings({ screenOffMs: 600000, screenOffSource: 'user' });
    const result = evaluateCosmicScreenLock(tenMinutes);
    expect(result).toMatchObject({
      checkType: 'screen_lock',
      passed: true,
      details: {
        method: 'cosmic-config (COSMIC)',
        message:
          'Screen locks 10 minutes 5.5 seconds after the last input (screen off at 10 minutes)',
      },
    });
    expect(JSON.parse(result.details.raw)).toEqual({ ...tenMinutes, lockDelayMs: 605500 });
  });

  it('puts the boundary on the moment the lock runs, not on screen off', () => {
    expect(evaluateCosmicScreenLock(settings({ screenOffMs: 894500 })).passed).toBe(true);
    expect(evaluateCosmicScreenLock(settings({ screenOffMs: 894501 })).passed).toBe(false);
  });

  it('fails when the screen never turns off', () => {
    const result = evaluateCosmicScreenLock(settings({ screenOffMs: null }));
    expect(result.passed).toBe(false);
    expect(result.details.message).toContain('never turns off');
  });

  it.each([
    { idleDaemonRunning: false, message: 'not running' },
    { idleDaemonRunning: null, message: 'Could not confirm' },
  ])('fails when cosmic-idle running is $idleDaemonRunning', ({ idleDaemonRunning, message }) => {
    const result = evaluateCosmicScreenLock(settings({ screenOffMs: 300000, idleDaemonRunning }));
    expect(result.passed).toBe(false);
    expect(result.details.message).toContain(message);
  });

  it.each([
    { lockCommand: '', message: 'disabled' },
    { lockCommand: 'true', message: 'custom command' },
  ])('fails when the lock action is $lockCommand', ({ lockCommand, message }) => {
    const result = evaluateCosmicScreenLock(settings({ screenOffMs: 300000, lockCommand }));
    expect(result.passed).toBe(false);
    expect(result.details.message).toContain(message);
  });

  it('keeps details within the check-in limits for a very long custom command', () => {
    const result = evaluateCosmicScreenLock(
      settings({ screenOffMs: 300000, lockCommand: 'x'.repeat(5000) }),
    );
    expect(result.details.raw.length).toBeLessThanOrEqual(2000);
    expect(result.details.message.length).toBeLessThanOrEqual(1000);
  });
});

describe('checkCosmicScreenLock', () => {
  beforeEach(() => {
    readCosmicScreenLockMock.mockReset();
  });

  it('evaluates the settings it reads', () => {
    readCosmicScreenLockMock.mockReturnValue(settings({ screenOffMs: 300000 }));
    expect(checkCosmicScreenLock({}).passed).toBe(true);
  });

  it('reports config COSMIC could not read as undetermined under the COSMIC method', () => {
    readCosmicScreenLockMock.mockImplementation(() => {
      throw new CosmicConfigError('/x/screen_off_time does not hold a valid screen_off_time');
    });
    expect(checkCosmicScreenLock({})).toMatchObject({
      passed: false,
      details: {
        method: 'cosmic-config (COSMIC)',
        message: expect.stringContaining('/x/screen_off_time'),
        exception: 'COSMIC screen lock settings could not be read',
      },
    });
  });

  it('lets unexpected errors reach the caller', () => {
    readCosmicScreenLockMock.mockImplementation(() => {
      throw new TypeError('boom');
    });
    expect(() => checkCosmicScreenLock({})).toThrow(TypeError);
  });
});
