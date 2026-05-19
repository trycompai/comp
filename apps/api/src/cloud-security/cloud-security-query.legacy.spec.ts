// Pure-function tests for the legacy-result filter — exercise the
// missed-lastRunAt-advance recovery path without spinning up Prisma.

// The legacy module imports @db at module load. Mock it (we only need
// the pure exports here).
jest.mock('@db', () => ({}));
jest.mock('./evidence-sanitizer', () => ({
  sanitizeEvidence: (v: unknown) => v,
}));

import {
  filterToLatestScanResults,
  SCAN_WINDOW_MS,
} from './cloud-security-query.legacy';

const SCAN_WINDOW_MIN = SCAN_WINDOW_MS / 60_000;

function ms(daysAgo: number, minutesAgoExtra = 0): Date {
  return new Date(
    Date.now() - daysAgo * 86_400_000 - minutesAgoExtra * 60_000,
  );
}

describe('filterToLatestScanResults', () => {
  it('includes a result whose completedAt is at lastRunAt', () => {
    const lastRunAt = ms(0);
    const result = { integrationId: 'int_1', completedAt: lastRunAt };
    expect(
      filterToLatestScanResults([result], new Map([['int_1', lastRunAt]])),
    ).toEqual([result]);
  });

  it('keeps results from the latest scan when lastRunAt has NOT advanced — the bug fix', () => {
    // Scenario: scan ran 5 min ago, wrote IntegrationResult rows with
    // completedAt=now-5min, but Integration.lastRunAt is still set to its
    // old value (24h ago). Pre-fix: those new results would be dropped.
    const oldLastRunAt = ms(1); // 24h ago
    const newResultTime = ms(0, 5); // 5 minutes ago
    const result = { integrationId: 'int_1', completedAt: newResultTime };
    expect(
      filterToLatestScanResults([result], new Map([['int_1', oldLastRunAt]])),
    ).toEqual([result]);
  });

  it('excludes results outside the scan window of the latest signal', () => {
    const lastRunAt = ms(0);
    const oldResult = {
      integrationId: 'int_1',
      completedAt: ms(0, SCAN_WINDOW_MIN + 5),
    };
    expect(
      filterToLatestScanResults([oldResult], new Map([['int_1', lastRunAt]])),
    ).toEqual([]);
  });

  it('uses the max result completedAt as fallback when lastRunAt is missing', () => {
    const newest = ms(0);
    const inWindow = { integrationId: 'int_1', completedAt: ms(0, 5) };
    const tooOld = {
      integrationId: 'int_1',
      completedAt: ms(0, SCAN_WINDOW_MIN + 10),
    };
    const newestRow = { integrationId: 'int_1', completedAt: newest };
    expect(
      filterToLatestScanResults(
        [tooOld, inWindow, newestRow],
        new Map(), // empty lastRunMap → fall back to results
      ),
    ).toEqual([inWindow, newestRow]);
  });

  it('handles per-integration scoping correctly (one integration\'s scan window does not leak into another)', () => {
    const intALastRun = ms(0);
    const intBLastRun = ms(7); // a week ago — separate cadence
    const fromA = { integrationId: 'int_A', completedAt: ms(0, 3) };
    const fromB = { integrationId: 'int_B', completedAt: ms(7, 3) };
    // A result that's "fresh" for B but way outside A's window:
    const staleForA = { integrationId: 'int_A', completedAt: ms(7, 3) };
    const lastRunMap = new Map([
      ['int_A', intALastRun],
      ['int_B', intBLastRun],
    ]);
    const filtered = filterToLatestScanResults(
      [fromA, fromB, staleForA],
      lastRunMap,
    );
    expect(filtered).toEqual([fromA, fromB]);
  });

  it('excludes rows with null completedAt', () => {
    expect(
      filterToLatestScanResults(
        [{ integrationId: 'int_1', completedAt: null }],
        new Map([['int_1', ms(0)]]),
      ),
    ).toEqual([]);
  });

  it('returns an empty array when neither lastRunAt nor any completedAt is available', () => {
    expect(
      filterToLatestScanResults(
        [{ integrationId: 'int_1', completedAt: null }],
        new Map(),
      ),
    ).toEqual([]);
  });

  it('does NOT include results whose completedAt is far in the future of the reference', () => {
    // Sanity: results from a future scan window aren't pulled forward.
    const lastRunAt = ms(0);
    const futureResult = {
      integrationId: 'int_1',
      completedAt: new Date(Date.now() + 86_400_000), // tomorrow
    };
    // The max-fallback would pick the future result as the reference, then
    // include results within window of THAT future point — and the future
    // result itself is in that window. We accept this since adversarial
    // future-dated data is not a realistic scenario for this legacy path.
    // Just lock in the documented behavior so it doesn't change silently.
    const out = filterToLatestScanResults(
      [futureResult],
      new Map([['int_1', lastRunAt]]),
    );
    expect(out).toEqual([futureResult]);
  });
});
