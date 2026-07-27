import { describe, expect, it } from 'vitest';
import type { StoredCheckRun } from '../hooks/useIntegrationChecks';
import {
  groupRunsByConnection,
  summarizeLatestPerAccount,
} from './check-run-grouping';

const makeRun = (
  overrides: Partial<StoredCheckRun> & {
    id: string;
    connectionId: string;
  },
): StoredCheckRun => {
  const createdAt = overrides.createdAt ?? '2026-06-09T00:00:00.000Z';
  return {
    checkId: 'aws-s3-encryption',
    checkName: 'S3 — default encryption enabled',
    status: 'success',
    startedAt: createdAt,
    durationMs: 100,
    totalChecked: 1,
    passedCount: 0,
    failedCount: 0,
    connectionLabel: `AWS ${overrides.connectionId}`,
    provider: { slug: 'aws', name: 'AWS' },
    results: [],
    ...overrides,
    // completedAt tracks createdAt (as in real runs) unless explicitly set.
    completedAt: overrides.completedAt ?? createdAt,
    createdAt,
  };
};

describe('groupRunsByConnection', () => {
  it('groups runs by account, preserving order across and within accounts', () => {
    const runs = [
      makeRun({ id: 'r1', connectionId: 'A', createdAt: '2026-06-09T12:00:00Z' }),
      makeRun({ id: 'r2', connectionId: 'B', createdAt: '2026-06-09T11:00:00Z' }),
      makeRun({ id: 'r3', connectionId: 'A', createdAt: '2026-06-09T10:00:00Z' }),
    ];
    const groups = groupRunsByConnection(runs);
    expect(groups.map((g) => g.connectionId)).toEqual(['A', 'B']);
    expect(groups[0].runs.map((r) => r.id)).toEqual(['r1', 'r3']);
    expect(groups[1].runs.map((r) => r.id)).toEqual(['r2']);
  });

  it('uses the connection label, falling back when absent', () => {
    const groups = groupRunsByConnection([
      makeRun({ id: 'r1', connectionId: 'A', connectionLabel: 'Production AWS' }),
      makeRun({ id: 'r2', connectionId: 'B', connectionLabel: '' }),
    ]);
    expect(groups[0].label).toBe('Production AWS');
    expect(groups[1].label).toBe('Account');
  });
});

describe('summarizeLatestPerAccount', () => {
  it('sums the latest run of each account', () => {
    const runs = [
      // Account A: latest is newest (12:00) with 30 passed.
      makeRun({ id: 'a1', connectionId: 'A', passedCount: 30, createdAt: '2026-06-09T12:00:00Z' }),
      makeRun({ id: 'a0', connectionId: 'A', passedCount: 5, createdAt: '2026-06-09T08:00:00Z' }),
      // Account B: latest has 2 findings.
      makeRun({
        id: 'b1',
        connectionId: 'B',
        status: 'failed',
        passedCount: 10,
        failedCount: 2,
        createdAt: '2026-06-09T11:00:00Z',
      }),
    ];
    const summary = summarizeLatestPerAccount(runs);
    expect(summary.accountCount).toBe(2);
    expect(summary.passed).toBe(40); // 30 (A latest) + 10 (B latest), NOT A's older 5
    expect(summary.failed).toBe(2);
    expect(summary.hasFailed).toBe(true);
    expect(summary.hasSucceeded).toBe(true); // A passed
    expect(summary.lastRunAt).toBe('2026-06-09T12:00:00Z');
  });

  it('is empty for no runs', () => {
    const summary = summarizeLatestPerAccount([]);
    expect(summary).toEqual({
      accountCount: 0,
      passed: 0,
      failed: 0,
      lastRunAt: null,
      hasFailed: false,
      hasSucceeded: false,
    });
  });

  // CS-753: a check whose recent runs are all held server-side (hidden from
  // the runs list) still RAN — "Last ran" must advance to the newest attempt,
  // while counts/status keep reflecting the latest visible run.
  it('advances lastRunAt to a newer held attempt without touching counts/status', () => {
    const runs = [
      makeRun({
        id: 'a1',
        connectionId: 'A',
        status: 'failed',
        passedCount: 34,
        failedCount: 10,
        createdAt: '2026-07-13T10:00:00Z',
      }),
    ];
    const summary = summarizeLatestPerAccount(runs, [
      { connectionId: 'A', checkId: 'aws-s3-encryption', lastAttemptAt: '2026-07-16T06:00:00Z' },
    ]);
    expect(summary.lastRunAt).toBe('2026-07-16T06:00:00Z');
    // Results shown are still the latest VISIBLE run's.
    expect(summary.passed).toBe(34);
    expect(summary.failed).toBe(10);
    expect(summary.hasFailed).toBe(true);
  });

  it('ignores attempts older than the latest visible run', () => {
    const runs = [
      makeRun({ id: 'a1', connectionId: 'A', createdAt: '2026-07-16T06:00:00Z' }),
    ];
    const summary = summarizeLatestPerAccount(runs, [
      { connectionId: 'A', checkId: 'aws-s3-encryption', lastAttemptAt: '2026-07-13T06:00:00Z' },
    ]);
    expect(summary.lastRunAt).toBe('2026-07-16T06:00:00Z');
  });

  it('keeps "Not run yet" (null) when a check has only ever been held', () => {
    // Held-only checks have no visible runs; their outcomes stay hidden by
    // design, so the attempt timestamp alone must not fabricate a summary.
    const summary = summarizeLatestPerAccount([], [
      { connectionId: 'A', checkId: 'aws-s3-encryption', lastAttemptAt: '2026-07-16T06:00:00Z' },
    ]);
    expect(summary.lastRunAt).toBeNull();
    expect(summary.accountCount).toBe(0);
  });
});
