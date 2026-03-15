import { describe, it, expect, afterEach, beforeEach } from 'bun:test';
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('config serialization', () => {
  const testConfigPath = join(tmpdir(), `.comprc-test-${Date.now()}`);

  afterEach(() => {
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  it('should serialize config with session to JSON', () => {
    const config = {
      activeEnv: 'local',
      environments: {
        local: {
          apiUrl: 'http://localhost:3333',
          session: {
            token: 'abc123',
            email: 'admin@test.com',
            expiresAt: '2099-01-01T00:00:00.000Z',
          },
        },
      },
    };

    writeFileSync(testConfigPath, JSON.stringify(config, null, 2) + '\n');
    const parsed = JSON.parse(readFileSync(testConfigPath, 'utf-8'));

    expect(parsed.activeEnv).toBe('local');
    expect(parsed.environments.local.apiUrl).toBe('http://localhost:3333');
    expect(parsed.environments.local.session.token).toBe('abc123');
    expect(parsed.environments.local.session.email).toBe('admin@test.com');
  });

  it('should handle config without session', () => {
    const config = {
      activeEnv: 'staging',
      environments: {
        staging: { apiUrl: 'https://api.staging.trycomp.ai' },
      },
    };

    writeFileSync(testConfigPath, JSON.stringify(config, null, 2));
    const parsed = JSON.parse(readFileSync(testConfigPath, 'utf-8'));

    expect(parsed.environments.staging.session).toBeUndefined();
  });

  it('should handle multiple environments with independent sessions', () => {
    const config = {
      activeEnv: 'staging' as const,
      environments: {
        local: {
          apiUrl: 'http://localhost:3333',
          session: { token: 'local-tok', email: 'a@t.com', expiresAt: '2099-01-01T00:00:00Z' },
        },
        staging: {
          apiUrl: 'https://api.staging.trycomp.ai',
          session: { token: 'staging-tok', email: 'b@t.com', expiresAt: '2099-01-01T00:00:00Z' },
        },
        production: {
          apiUrl: 'https://api.trycomp.ai',
        },
      },
    };

    const active = config.environments[config.activeEnv];
    expect(active.session?.token).toBe('staging-tok');
  });
});

describe('session expiry', () => {
  it('should detect expired sessions', () => {
    const expiresAt = new Date('2020-01-01T00:00:00.000Z');
    expect(expiresAt <= new Date()).toBe(true);
  });

  it('should detect valid sessions', () => {
    const expiresAt = new Date('2099-01-01T00:00:00.000Z');
    expect(expiresAt > new Date()).toBe(true);
  });
});

describe('getActiveSession', () => {
  // Test the session logic directly (without filesystem side effects)
  function checkSession(session: { expiresAt: string } | undefined): boolean {
    if (!session) return false;
    const expiresAt = new Date(session.expiresAt);
    return expiresAt > new Date();
  }

  it('should return false for undefined session', () => {
    expect(checkSession(undefined)).toBe(false);
  });

  it('should return false for expired session', () => {
    expect(
      checkSession({ expiresAt: '2020-01-01T00:00:00.000Z' }),
    ).toBe(false);
  });

  it('should return true for valid session', () => {
    expect(
      checkSession({ expiresAt: '2099-01-01T00:00:00.000Z' }),
    ).toBe(true);
  });
});

describe('saveSession / clearSession logic', () => {
  const testPath = join(tmpdir(), `.comprc-session-test-${Date.now()}`);

  afterEach(() => {
    if (existsSync(testPath)) unlinkSync(testPath);
  });

  it('should add session to existing environment', () => {
    const config = {
      activeEnv: 'local',
      environments: {
        local: { apiUrl: 'http://localhost:3333' },
      },
    };
    writeFileSync(testPath, JSON.stringify(config));

    // Simulate saveSession
    const loaded = JSON.parse(readFileSync(testPath, 'utf-8'));
    loaded.environments.local.session = {
      token: 'tok123',
      email: 'me@test.com',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
    writeFileSync(testPath, JSON.stringify(loaded, null, 2));

    const result = JSON.parse(readFileSync(testPath, 'utf-8'));
    expect(result.environments.local.session.token).toBe('tok123');
    expect(result.environments.local.session.email).toBe('me@test.com');
    expect(result.environments.local.apiUrl).toBe('http://localhost:3333');
  });

  it('should clear session without removing environment', () => {
    const config = {
      activeEnv: 'local',
      environments: {
        local: {
          apiUrl: 'http://localhost:3333',
          session: {
            token: 'tok',
            email: 'a@b.com',
            expiresAt: '2099-01-01T00:00:00Z',
          },
        },
      },
    };
    writeFileSync(testPath, JSON.stringify(config));

    // Simulate clearSession
    const loaded = JSON.parse(readFileSync(testPath, 'utf-8'));
    delete loaded.environments.local.session;
    writeFileSync(testPath, JSON.stringify(loaded, null, 2));

    const result = JSON.parse(readFileSync(testPath, 'utf-8'));
    expect(result.environments.local.session).toBeUndefined();
    expect(result.environments.local.apiUrl).toBe('http://localhost:3333');
  });
});
