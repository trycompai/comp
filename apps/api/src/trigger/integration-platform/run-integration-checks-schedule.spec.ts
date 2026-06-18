import { TaskFrequency } from '@trycompai/db';
import {
  filterDueTasks,
} from './run-integration-checks-schedule';
import {
  getEnabledChecksForScheduledTask,
  resolveProviderChecks,
} from './scheduled-task-checks';
import { ENABLED_TASK_CHECKS_KEY } from '../../integration-platform/utils/disabled-task-checks';

// Mock @db at the module boundary so importing the orchestrator does not try
// to connect to Postgres. We never call the scheduled `run` function itself
// (it's wrapped in `schedules.task({...})` and not independently invokable),
// we only exercise the pure helper it uses.
jest.mock('@db', () => ({
  db: {
    integrationConnection: { findMany: jest.fn() },
    task: { findMany: jest.fn(), update: jest.fn() },
    dynamicIntegration: { findMany: jest.fn() },
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

describe('resolveProviderChecks (static vs dynamic)', () => {
  it('uses the static code manifest when present (and ignores any dynamic map)', () => {
    const checks = resolveProviderChecks({
      manifest: {
        checks: [
          { id: 'two_factor_auth', taskMapping: 'tpl_mfa' },
          { id: 'branch_protection', taskMapping: null },
        ],
      },
      dynamicChecks: [
        {
          id: 'should_not_be_used',
          taskMapping: 'tpl_x',
          taskRunEnabledByDefault: true,
        },
      ],
    });

    expect(checks).toEqual([
      {
        id: 'two_factor_auth',
        taskMapping: 'tpl_mfa',
        taskRunEnabledByDefault: true,
      },
      {
        id: 'branch_protection',
        taskMapping: null,
        taskRunEnabledByDefault: true,
      },
    ]);
  });

  it('falls back to the dynamic DB map when there is no manifest (the fix)', () => {
    const checks = resolveProviderChecks({
      manifest: undefined,
      dynamicChecks: [
        {
          id: 'mfa_enforcement',
          taskMapping: 'frk_tt_mfa',
          taskRunEnabledByDefault: true,
        },
        {
          id: 'supabase_mfa',
          taskMapping: 'frk_tt_mfa',
          taskRunEnabledByDefault: true,
        },
      ],
    });

    expect(checks).toEqual([
      {
        id: 'mfa_enforcement',
        taskMapping: 'frk_tt_mfa',
        taskRunEnabledByDefault: true,
      },
      {
        id: 'supabase_mfa',
        taskMapping: 'frk_tt_mfa',
        taskRunEnabledByDefault: true,
      },
    ]);
  });

  it('returns [] for an unknown provider (no manifest, no dynamic entry)', () => {
    expect(
      resolveProviderChecks({ manifest: undefined, dynamicChecks: undefined }),
    ).toEqual([]);
  });

  it('normalizes an undefined manifest taskMapping to null', () => {
    const checks = resolveProviderChecks({
      manifest: { checks: [{ id: 'c1', taskMapping: undefined }] },
      dynamicChecks: undefined,
    });

    expect(checks).toEqual([
      { id: 'c1', taskMapping: null, taskRunEnabledByDefault: true },
    ]);
  });

  it('preserves manifest checks that are disabled for task runs by default', () => {
    const checks = resolveProviderChecks({
      manifest: {
        checks: [
          {
            id: 'gcp-environment-separation',
            taskMapping: 'frk_tt_environment_separation',
            taskRunEnabledByDefault: false,
          },
        ],
      },
      dynamicChecks: undefined,
    });

    expect(checks).toEqual([
      {
        id: 'gcp-environment-separation',
        taskMapping: 'frk_tt_environment_separation',
        taskRunEnabledByDefault: false,
      },
    ]);
  });
});

describe('getEnabledChecksForScheduledTask', () => {
  const defaultOnCheck = {
    id: 'branch_protection',
    taskMapping: 'tpl_code',
    taskRunEnabledByDefault: true,
  };
  const optInCheck = {
    id: 'gcp-environment-separation',
    taskMapping: 'tpl_env',
    taskRunEnabledByDefault: false,
  };

  it('skips opt-in checks until they are explicitly enabled for the task', () => {
    expect(
      getEnabledChecksForScheduledTask({
        checks: [optInCheck],
        taskTemplateId: 'tpl_env',
        taskId: 'tsk_1',
        metadata: {},
      }),
    ).toEqual([]);
  });

  it('includes opt-in checks after the user reconnects them for the task', () => {
    expect(
      getEnabledChecksForScheduledTask({
        checks: [optInCheck],
        taskTemplateId: 'tpl_env',
        taskId: 'tsk_1',
        metadata: {
          [ENABLED_TASK_CHECKS_KEY]: {
            tsk_1: ['gcp-environment-separation'],
          },
        },
      }),
    ).toEqual(['gcp-environment-separation']);
  });

  it('still includes normal default-on checks unless manually disabled', () => {
    expect(
      getEnabledChecksForScheduledTask({
        checks: [defaultOnCheck],
        taskTemplateId: 'tpl_code',
        taskId: 'tsk_1',
        metadata: {},
      }),
    ).toEqual(['branch_protection']);
  });
});
