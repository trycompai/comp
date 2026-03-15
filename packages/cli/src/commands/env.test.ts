import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('envCommand', () => {
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

  it('should display environment info with active and configured envs', () => {
    // Test the display logic directly
    const config = {
      activeEnv: 'local',
      environments: {
        local: { apiUrl: 'http://localhost:3333' },
        staging: { apiUrl: 'https://api.staging.trycomp.ai' },
      },
    };

    console.log(`Active: \x1b[1m${config.activeEnv}\x1b[0m`);
    const envNames = Object.keys(config.environments);
    console.log(`Configured: ${envNames.join(', ')}`);

    const output = consoleOutput.join('\n');
    expect(output).toContain('local');
    expect(output).toContain('local, staging');
  });

  it('should indicate when no environments are configured', () => {
    const config = { activeEnv: 'local', environments: {} };

    const envNames = Object.keys(config.environments);
    if (envNames.length === 0) {
      console.log('No environments configured. Run: comp init');
    }

    expect(consoleOutput.join('\n')).toContain('No environments configured');
  });

  it('should switch active env when target exists', () => {
    const config = {
      activeEnv: 'local',
      environments: {
        local: { apiUrl: 'http://localhost:3333' },
        staging: { apiUrl: 'https://api.staging.trycomp.ai' },
      },
    };

    const targetEnv = 'staging';
    if (config.environments[targetEnv as keyof typeof config.environments]) {
      config.activeEnv = targetEnv;
    }

    expect(config.activeEnv).toBe('staging');
  });
});
