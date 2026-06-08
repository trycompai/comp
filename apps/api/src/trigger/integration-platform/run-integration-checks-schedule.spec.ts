import { TaskFrequency } from '@trycompai/db';
import { filterDueTasks } from './run-integration-checks-schedule';

// Mock @db at the module boundary so importing the orchestrator does not try
// to connect to Postgres. We never call the scheduled `run` function itself
// (it's wrapped in `schedules.task({...})` and not independently invokable),
// we only exercise the pure helper it uses.
jest.mock('@db', () => ({
  db: {
    integrationConnection: { findMany: jest.fn() },
    task: { findMany: jest.fn(), update: jest.fn() },
  },
  TaskFrequency: {
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
    quarterly: 'quarterly',
    yearly: 'yearly',
  },
}));

jest.mock('@trycompai/integration-platform', () => ({
  getManifest: jest.fn(),
}));

jest.mock('@trigger.dev/sdk', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  schedules: {
    task: (config: unknown) => config,
  },
}));

jest.mock('./run-task-integration-checks', () => ({
  runTaskIntegrationChecks: { batchTrigger: jest.fn() },
}));

jest.mock('./run-device-sync', () => ({
  runDeviceSync: { trigger: jest.fn() },
}));

const atUtc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('filterDueTasks (integration orchestrator)', () => {
  const now = atUtc('2026-04-24');

  it('returns only tasks whose schedule says they are due', () => {
    const candidateTasks = [
      // Daily → always due
      {
        id: 'tsk_daily',
        title: 'Daily check',
        taskTemplateId: 'tpl_a',
        integrationScheduleFrequency: TaskFrequency.daily,
        integrationLastRunAt: atUtc('2026-04-23'),
      },
      // Weekly, ran 2 days ago → NOT due
      {
        id: 'tsk_weekly_recent',
        title: 'Recent weekly',
        taskTemplateId: 'tpl_b',
        integrationScheduleFrequency: TaskFrequency.weekly,
        integrationLastRunAt: atUtc('2026-04-22'),
      },
      // Weekly, ran 10 days ago → due
      {
        id: 'tsk_weekly_stale',
        title: 'Stale weekly',
        taskTemplateId: 'tpl_c',
        integrationScheduleFrequency: TaskFrequency.weekly,
        integrationLastRunAt: atUtc('2026-04-14'),
      },
    ];

    const dueTasks = filterDueTasks({ tasks: candidateTasks, now });

    expect(dueTasks.map((t) => t.id)).toEqual([
      'tsk_daily',
      'tsk_weekly_stale',
    ]);
  });

  it('treats a null integrationLastRunAt as due (first run)', () => {
    const candidateTasks = [
      {
        id: 'tsk_never_run',
        title: 'Never run',
        taskTemplateId: 'tpl_a',
        integrationScheduleFrequency: TaskFrequency.yearly,
        integrationLastRunAt: null as Date | null,
      },
    ];

    const dueTasks = filterDueTasks({ tasks: candidateTasks, now });

    expect(dueTasks).toHaveLength(1);
    expect(dueTasks[0]?.id).toBe('tsk_never_run');
  });

  it('returns an empty array when nothing is due', () => {
    const candidateTasks = [
      {
        id: 'tsk_monthly_recent',
        title: 'Recent monthly',
        taskTemplateId: 'tpl_a',
        integrationScheduleFrequency: TaskFrequency.monthly,
        integrationLastRunAt: atUtc('2026-04-10'),
      },
      {
        id: 'tsk_quarterly_recent',
        title: 'Recent quarterly',
        taskTemplateId: 'tpl_b',
        integrationScheduleFrequency: TaskFrequency.quarterly,
        integrationLastRunAt: atUtc('2026-03-01'),
      },
    ];

    const dueTasks = filterDueTasks({ tasks: candidateTasks, now });

    expect(dueTasks).toEqual([]);
  });
});
