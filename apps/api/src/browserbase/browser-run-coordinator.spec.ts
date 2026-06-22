import { BrowserRunCoordinator } from './browser-run-coordinator';

describe('BrowserRunCoordinator', () => {
  it('serializes runs for the same profile', async () => {
    process.env.BROWSER_AUTOMATION_DOMAIN_THROTTLE_MS = '1';
    const coordinator = new BrowserRunCoordinator();
    const events: string[] = [];
    let releaseFirst: () => void = () => {};

    const first = coordinator.withProfileLock({
      profileId: 'bap_1',
      hostname: 'example.com',
      run: async () => {
        events.push('first:start');
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
        events.push('first:end');
      },
    });

    const second = coordinator.withProfileLock({
      profileId: 'bap_1',
      hostname: 'example.com',
      run: async () => {
        events.push('second:start');
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toEqual(['first:start']);

    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(['first:start', 'first:end', 'second:start']);
  });

  it('serializes runs for the same hostname across profiles', async () => {
    process.env.BROWSER_AUTOMATION_DOMAIN_THROTTLE_MS = '1';
    const coordinator = new BrowserRunCoordinator();
    const events: string[] = [];
    let releaseFirst: () => void = () => {};

    const first = coordinator.withProfileLock({
      profileId: 'bap_1',
      hostname: 'example.com',
      run: async () => {
        events.push('first:start');
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
        events.push('first:end');
      },
    });

    const second = coordinator.withProfileLock({
      profileId: 'bap_2',
      hostname: 'example.com',
      run: async () => {
        events.push('second:start');
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toEqual(['first:start']);

    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(['first:start', 'first:end', 'second:start']);
  });
});
