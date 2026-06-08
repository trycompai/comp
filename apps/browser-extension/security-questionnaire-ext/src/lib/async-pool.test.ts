import { describe, expect, it } from 'vitest';
import { runConcurrent } from './async-pool';

describe('runConcurrent', () => {
  it('limits active work to the configured concurrency', async () => {
    let active = 0;
    let maxActive = 0;

    await runConcurrent({
      concurrency: 3,
      items: Array.from({ length: 10 }, (_value, index) => index),
      run: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active -= 1;
      },
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });
});
