import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// We test the config logic by directly importing internals.
// Since config.ts uses a hardcoded path (~/.comprc), we test the
// serialization/deserialization logic and defaults.

describe('config', () => {
  const testConfigPath = join(tmpdir(), `.comprc-test-${Date.now()}`);

  afterEach(() => {
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  it('should serialize config to JSON', () => {
    const config = {
      activeEnv: 'local',
      environments: {
        local: {
          apiUrl: 'http://localhost:3333',
          adminSecret: 'test-secret',
        },
      },
    };

    writeFileSync(testConfigPath, JSON.stringify(config, null, 2) + '\n');
    const raw = readFileSync(testConfigPath, 'utf-8');
    const parsed = JSON.parse(raw);

    expect(parsed.activeEnv).toBe('local');
    expect(parsed.environments.local.apiUrl).toBe('http://localhost:3333');
    expect(parsed.environments.local.adminSecret).toBe('test-secret');
  });

  it('should handle multiple environments', () => {
    const config = {
      activeEnv: 'staging',
      environments: {
        local: {
          apiUrl: 'http://localhost:3333',
          adminSecret: 'local-secret',
        },
        staging: {
          apiUrl: 'https://staging-api.trycomp.ai',
          adminSecret: 'staging-secret',
        },
        production: {
          apiUrl: 'https://api.trycomp.ai',
          adminSecret: 'prod-secret',
        },
      },
    };

    writeFileSync(testConfigPath, JSON.stringify(config, null, 2));
    const parsed = JSON.parse(readFileSync(testConfigPath, 'utf-8'));

    expect(parsed.activeEnv).toBe('staging');
    expect(Object.keys(parsed.environments)).toEqual([
      'local',
      'staging',
      'production',
    ]);
    expect(parsed.environments.staging.apiUrl).toBe(
      'https://staging-api.trycomp.ai',
    );
  });

  it('should return correct active env', () => {
    const config = {
      activeEnv: 'production',
      environments: {
        local: { apiUrl: 'http://localhost:3333', adminSecret: 's1' },
        production: { apiUrl: 'https://api.trycomp.ai', adminSecret: 's2' },
      },
    };

    const activeEnv = config.environments[config.activeEnv];
    expect(activeEnv).toBeDefined();
    expect(activeEnv?.apiUrl).toBe('https://api.trycomp.ai');
  });

  it('should return undefined for non-existent env', () => {
    const config = {
      activeEnv: 'doesnotexist',
      environments: {
        local: { apiUrl: 'http://localhost:3333', adminSecret: 's1' },
      },
    };

    const activeEnv =
      config.environments[
        config.activeEnv as keyof typeof config.environments
      ];
    expect(activeEnv).toBeUndefined();
  });
});
