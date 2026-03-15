import { describe, it, expect, afterEach } from 'bun:test';
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('config', () => {
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
    const raw = readFileSync(testConfigPath, 'utf-8');
    const parsed = JSON.parse(raw);

    expect(parsed.activeEnv).toBe('local');
    expect(parsed.environments.local.apiUrl).toBe('http://localhost:3333');
    expect(parsed.environments.local.session.token).toBe('abc123');
    expect(parsed.environments.local.session.email).toBe('admin@test.com');
  });

  it('should handle config without session', () => {
    const config = {
      activeEnv: 'staging',
      environments: {
        staging: {
          apiUrl: 'https://staging-api.trycomp.ai',
        },
      },
    };

    writeFileSync(testConfigPath, JSON.stringify(config, null, 2));
    const parsed = JSON.parse(readFileSync(testConfigPath, 'utf-8'));

    expect(parsed.environments.staging.session).toBeUndefined();
  });

  it('should handle multiple environments with independent sessions', () => {
    const config = {
      activeEnv: 'staging',
      environments: {
        local: {
          apiUrl: 'http://localhost:3333',
          session: { token: 'local-tok', email: 'a@t.com', expiresAt: '2099-01-01T00:00:00Z' },
        },
        staging: {
          apiUrl: 'https://staging-api.trycomp.ai',
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

  it('should detect expired sessions', () => {
    const session = {
      token: 'expired-tok',
      email: 'x@t.com',
      expiresAt: '2020-01-01T00:00:00.000Z',
    };

    const expiresAt = new Date(session.expiresAt);
    expect(expiresAt <= new Date()).toBe(true);
  });

  it('should detect valid sessions', () => {
    const session = {
      token: 'valid-tok',
      email: 'x@t.com',
      expiresAt: '2099-01-01T00:00:00.000Z',
    };

    const expiresAt = new Date(session.expiresAt);
    expect(expiresAt > new Date()).toBe(true);
  });
});
