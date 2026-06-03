// Mock the Trigger.dev SDK at the module boundary so importing the task does
// not require a trigger runtime. `task()` simply returns its config object,
// which lets us assert on the static configuration (e.g. maxDuration).
jest.mock('@trigger.dev/sdk', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  tags: { add: jest.fn() },
  task: (config: unknown) => config,
}));

import { runDeviceSync } from './run-device-sync';

const config = runDeviceSync as unknown as { id: string; maxDuration: number };

describe('runDeviceSync task config', () => {
  it('declares maxDuration in SECONDS, not milliseconds', () => {
    // Trigger.dev maxDuration is in seconds. 10 minutes = 600.
    // The ms form (1000 * 60 * 10 = 600_000) would be ~7 days.
    expect(config.maxDuration).toBe(600);
    expect(config.maxDuration).toBeLessThan(24 * 60 * 60);
  });
});
