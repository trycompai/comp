import { TaskFrequency } from '@trycompai/db';
import {
  filterDueAutomations,
  limitAutomationBatch,
} from './run-browser-automations-schedule';

// Mock @db at the module boundary so importing the orchestrator does not try
// to connect to Postgres. We never call the scheduled `run` function itself
// (it's wrapped in `schedules.task({...})` and not independently invokable),
// we only exercise the pure helper it uses.
jest.mock('@db', () => ({
  db: {
    browserAutomation: { findMany: jest.fn(), update: jest.fn() },
  },
  TaskFrequency: {
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
    quarterly: 'quarterly',
    yearly: 'yearly',
  },
}));

jest.mock('@trigger.dev/sdk', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  schedules: {
    task: (config: unknown) => config,
  },
}));

jest.mock('./run-browser-automation', () => ({
  runBrowserAutomation: { batchTrigger: jest.fn() },
}));

const atUtc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('filterDueAutomations (browser automation orchestrator)', () => {
  const now = atUtc('2026-04-24');

  it('returns only automations whose schedule says they are due', () => {
    const candidateAutomations = [
      // Daily → always due
      {
        id: 'ba_daily',
        name: 'Daily login check',
        taskId: 'tsk_a',
        scheduleFrequency: TaskFrequency.daily,
        lastRunAt: atUtc('2026-04-23'),
      },
      // Weekly, ran 3 days ago → NOT due
      {
        id: 'ba_weekly_recent',
        name: 'Recent weekly',
        taskId: 'tsk_b',
        scheduleFrequency: TaskFrequency.weekly,
        lastRunAt: atUtc('2026-04-21'),
      },
      // Weekly, ran 10 days ago → due
      {
        id: 'ba_weekly_stale',
        name: 'Stale weekly',
        taskId: 'tsk_c',
        scheduleFrequency: TaskFrequency.weekly,
        lastRunAt: atUtc('2026-04-14'),
      },
    ];

    const due = filterDueAutomations({
      automations: candidateAutomations,
      now,
    });

    expect(due.map((a) => a.id)).toEqual(['ba_daily', 'ba_weekly_stale']);
  });

  it('treats a null lastRunAt as due (first run)', () => {
    const candidateAutomations = [
      {
        id: 'ba_never_run',
        name: 'Never run',
        taskId: 'tsk_a',
        scheduleFrequency: TaskFrequency.weekly,
        lastRunAt: null as Date | null,
      },
    ];

    const due = filterDueAutomations({
      automations: candidateAutomations,
      now,
    });

    expect(due).toHaveLength(1);
    expect(due[0]?.id).toBe('ba_never_run');
  });

  it('returns an empty array when nothing is due', () => {
    const candidateAutomations = [
      {
        id: 'ba_monthly_recent',
        name: 'Recent monthly',
        taskId: 'tsk_a',
        scheduleFrequency: TaskFrequency.monthly,
        lastRunAt: atUtc('2026-04-10'),
      },
      {
        id: 'ba_quarterly_recent',
        name: 'Recent quarterly',
        taskId: 'tsk_b',
        scheduleFrequency: TaskFrequency.quarterly,
        lastRunAt: atUtc('2026-03-01'),
      },
    ];

    const due = filterDueAutomations({
      automations: candidateAutomations,
      now,
    });

    expect(due).toEqual([]);
  });
});

describe('limitAutomationBatch', () => {
  it('limits due automations by organization and hostname', () => {
    const automations = [
      {
        id: 'ba_1',
        targetUrl: 'https://github.com/a',
        task: { organizationId: 'org_1' },
      },
      {
        id: 'ba_2',
        targetUrl: 'https://github.com/b',
        task: { organizationId: 'org_1' },
      },
      {
        id: 'ba_3',
        targetUrl: 'https://gitlab.com/a',
        task: { organizationId: 'org_1' },
      },
      {
        id: 'ba_4',
        targetUrl: 'https://github.com/c',
        task: { organizationId: 'org_2' },
      },
    ];

    const limited = limitAutomationBatch({
      automations,
      maxPerOrg: 2,
      maxPerHostname: 2,
    });

    expect(limited.map((automation) => automation.id)).toEqual([
      'ba_1',
      'ba_2',
    ]);
  });

  it('prioritizes never-run and oldest automations before applying caps', () => {
    const automations = [
      {
        id: 'ba_newer',
        lastRunAt: atUtc('2026-04-20'),
        targetUrl: 'https://github.com/newer',
        task: { organizationId: 'org_1' },
      },
      {
        id: 'ba_never',
        lastRunAt: null,
        targetUrl: 'https://github.com/never',
        task: { organizationId: 'org_1' },
      },
      {
        id: 'ba_older',
        lastRunAt: atUtc('2026-04-01'),
        targetUrl: 'https://gitlab.com/older',
        task: { organizationId: 'org_1' },
      },
    ];

    const limited = limitAutomationBatch({
      automations,
      maxPerOrg: 2,
      maxPerHostname: 2,
    });

    expect(limited.map((automation) => automation.id)).toEqual([
      'ba_never',
      'ba_older',
    ]);
  });

  it('skips malformed target URLs without dropping valid automations', () => {
    const automations = [
      {
        id: 'ba_bad',
        targetUrl: 'not-a-url',
        task: { organizationId: 'org_1' },
      },
      {
        id: 'ba_good',
        targetUrl: 'https://github.com/a',
        task: { organizationId: 'org_1' },
      },
    ];

    const limited = limitAutomationBatch({
      automations,
      maxPerOrg: 2,
      maxPerHostname: 2,
    });

    expect(limited.map((automation) => automation.id)).toEqual(['ba_good']);
  });
});
