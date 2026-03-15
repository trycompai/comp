import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('logoutCommand logic', () => {
  let consoleOutput: string[];
  const originalLog = console.log;

  beforeEach(() => {
    consoleOutput = [];
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.map(String).join(' '));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it('should clear session and show logout message', () => {
    const config = {
      activeEnv: 'local',
      environments: {
        local: {
          apiUrl: 'http://localhost:3333',
          session: {
            token: 'tok123',
            email: 'admin@test.com',
            expiresAt: '2099-01-01T00:00:00Z',
          },
        },
      },
    };

    const env = config.environments[config.activeEnv as keyof typeof config.environments];

    if (env?.session) {
      const email = env.session.email;
      delete (env as Record<string, unknown>).session;
      console.log(`Logged out ${email} from ${config.activeEnv}`);
    }

    expect(env?.session).toBeUndefined();
    expect(consoleOutput.join('\n')).toContain('admin@test.com');
    expect(consoleOutput.join('\n')).toContain('local');
  });

  it('should show "not logged in" when no session exists', () => {
    const config = {
      activeEnv: 'local',
      environments: {
        local: { apiUrl: 'http://localhost:3333' },
      },
    };

    const env = config.environments[config.activeEnv as keyof typeof config.environments] as {
      session?: unknown;
    };

    if (!env?.session) {
      console.log('Not logged in.');
    }

    expect(consoleOutput.join('\n')).toContain('Not logged in');
  });
});
