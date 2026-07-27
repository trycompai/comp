import { TaskFrequency } from '@trycompai/db';
import { db } from '@db';
import { getManifest } from '@trycompai/integration-platform';
import {
  filterDueTasks,
  groupTasksByOrg,
  integrationChecksSchedule,
  resolveProviderChecks,
} from './run-integration-checks-schedule';
import { runOrgIntegrationChecks } from './run-org-integration-checks';

// Mock @db at the module boundary so importing the orchestrator does not try
// to connect to Postgres. We never call the scheduled `run` function itself
// (it's wrapped in `schedules.task({...})` and not independently invokable),
// we only exercise the pure helper it uses.
jest.mock('@db', () => ({
  db: {
    integrationConnection: { findMany: jest.fn() },
    task: { findMany: jest.fn(), update: jest.fn() },
    dynamicIntegration: { findMany: jest.fn() },
    organization: { findMany: jest.fn() },
  },
  TaskFrequency: {
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
    quarterly: 'quarterly',
    yearly: 'yearly',
  },
  TaskAutomationStatus: {
    AUTOMATED: 'AUTOMATED',
    MANUAL: 'MANUAL',
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

// The orchestrator now dispatches ONE per-org runner instead of N per-task
// runs. Mock the runner module so importing the orchestrator doesn't load the
// real runner (which calls queue()/task() at module load).
jest.mock('./run-org-integration-checks', () => ({
  runOrgIntegrationChecks: { batchTrigger: jest.fn() },
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
      dynamicChecks: [{ id: 'should_not_be_used', taskMapping: 'tpl_x' }],
    });

    expect(checks).toEqual([
      { id: 'two_factor_auth', taskMapping: 'tpl_mfa' },
      { id: 'branch_protection', taskMapping: null },
    ]);
  });

  it('falls back to the dynamic DB map when there is no manifest (the fix)', () => {
    const checks = resolveProviderChecks({
      manifest: undefined,
      dynamicChecks: [
        { id: 'mfa_enforcement', taskMapping: 'frk_tt_mfa' },
        { id: 'supabase_mfa', taskMapping: 'frk_tt_mfa' },
      ],
    });

    expect(checks).toEqual([
      { id: 'mfa_enforcement', taskMapping: 'frk_tt_mfa' },
      { id: 'supabase_mfa', taskMapping: 'frk_tt_mfa' },
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

    expect(checks).toEqual([{ id: 'c1', taskMapping: null }]);
  });
});

describe('groupTasksByOrg (bundling key)', () => {
  const base = {
    taskTitle: 'T',
    connectionId: 'conn',
    providerSlug: 'github',
    checkIds: ['c1'],
  };

  it('groups tasks by organization and attaches the org name', () => {
    const groups = groupTasksByOrg({
      tasksToRun: [
        { ...base, taskId: 't1', organizationId: 'org1' },
        { ...base, taskId: 't2', organizationId: 'org1' },
        { ...base, taskId: 't3', organizationId: 'org2' },
      ],
      orgNameById: new Map([
        ['org1', 'Org One'],
        ['org2', 'Org Two'],
      ]),
    });

    expect(groups).toHaveLength(2);
    const org1 = groups.find((g) => g.organizationId === 'org1');
    expect(org1?.organizationName).toBe('Org One');
    expect(org1?.tasks.map((t) => t.taskId)).toEqual(['t1', 't2']);
    // organizationId is hoisted to the group; tasks carry the per-task shape.
    expect(org1?.tasks[0]).not.toHaveProperty('organizationId');
    expect(groups.find((g) => g.organizationId === 'org2')?.tasks).toHaveLength(
      1,
    );
  });

  it('falls back to "your organization" when the name is unknown', () => {
    const groups = groupTasksByOrg({
      tasksToRun: [{ ...base, taskId: 't1', organizationId: 'orgX' }],
      orgNameById: new Map(),
    });

    expect(groups[0]?.organizationName).toBe('your organization');
  });

  it('returns [] for no tasks', () => {
    expect(
      groupTasksByOrg({ tasksToRun: [], orgNameById: new Map() }),
    ).toEqual([]);
  });
});

describe('orchestrator excludes MANUAL tasks from scheduled runs', () => {
  // Cast the db/getManifest mocks to their jest.Mock shape for setup.
  const taskFindMany = (db as unknown as { task: { findMany: jest.Mock } }).task
    .findMany;
  const connectionFindMany = (
    db as unknown as { integrationConnection: { findMany: jest.Mock } }
  ).integrationConnection.findMany;
  const dynamicFindMany = (
    db as unknown as { dynamicIntegration: { findMany: jest.Mock } }
  ).dynamicIntegration.findMany;
  const orgFindMany = (
    db as unknown as { organization: { findMany: jest.Mock } }
  ).organization.findMany;
  const getManifestMock = getManifest as jest.Mock;

  // schedules.task is mocked to return the config, so .run is invokable here.
  const runOrchestrator = (
    integrationChecksSchedule as unknown as {
      run: (p: { timestamp: Date; lastTimestamp?: Date }) => Promise<unknown>;
    }
  ).run;

  beforeEach(() => {
    jest.clearAllMocks();
    connectionFindMany.mockResolvedValue([
      {
        id: 'conn1',
        provider: { slug: 'github' },
        organizationId: 'org1',
        organization: { id: 'org1', name: 'Org' },
        metadata: null,
      },
    ]);
    dynamicFindMany.mockResolvedValue([]);
    getManifestMock.mockReturnValue({
      checks: [{ id: 'c1', taskMapping: 'tpl_a' }],
    });
    taskFindMany.mockResolvedValue([]); // no due tasks → no triggers
    orgFindMany.mockResolvedValue([]); // device-sync section is a no-op
  });

  it('queries candidate tasks with an automationStatus != MANUAL filter', async () => {
    await runOrchestrator({ timestamp: new Date(), lastTimestamp: new Date() });

    expect(taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org1',
          taskTemplateId: { in: ['tpl_a'] },
          automationStatus: { not: 'MANUAL' },
        }),
      }),
    );
  });
});

describe('orchestrator dispatches ONE runner per org', () => {
  const taskFindMany = (db as unknown as { task: { findMany: jest.Mock } }).task
    .findMany;
  const connectionFindMany = (
    db as unknown as { integrationConnection: { findMany: jest.Mock } }
  ).integrationConnection.findMany;
  const dynamicFindMany = (
    db as unknown as { dynamicIntegration: { findMany: jest.Mock } }
  ).dynamicIntegration.findMany;
  const orgFindMany = (
    db as unknown as { organization: { findMany: jest.Mock } }
  ).organization.findMany;
  const getManifestMock = getManifest as jest.Mock;
  const batchTrigger = (
    runOrgIntegrationChecks as unknown as { batchTrigger: jest.Mock }
  ).batchTrigger;

  const runOrchestrator = (
    integrationChecksSchedule as unknown as {
      run: (p: { timestamp: Date; lastTimestamp?: Date }) => Promise<unknown>;
    }
  ).run;

  beforeEach(() => {
    jest.clearAllMocks();
    // Two orgs, each with one active connection mapped to the same template.
    connectionFindMany.mockResolvedValue([
      {
        id: 'conn1',
        provider: { slug: 'github' },
        organizationId: 'org1',
        organization: { id: 'org1', name: 'Org One' },
        metadata: null,
      },
      {
        id: 'conn2',
        provider: { slug: 'github' },
        organizationId: 'org2',
        organization: { id: 'org2', name: 'Org Two' },
        metadata: null,
      },
    ]);
    dynamicFindMany.mockResolvedValue([]);
    getManifestMock.mockReturnValue({
      checks: [{ id: 'c1', taskMapping: 'tpl_a' }],
    });
    // One due (daily) task per connection.
    taskFindMany
      .mockResolvedValueOnce([
        {
          id: 'task_org1',
          title: 'Org1 Task',
          taskTemplateId: 'tpl_a',
          integrationScheduleFrequency: 'daily',
          integrationLastRunAt: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'task_org2',
          title: 'Org2 Task',
          taskTemplateId: 'tpl_a',
          integrationScheduleFrequency: 'daily',
          integrationLastRunAt: null,
        },
      ]);
    orgFindMany.mockResolvedValue([]);
  });

  it('triggers the per-org runner once with one payload per org (not per task)', async () => {
    await runOrchestrator({ timestamp: new Date(), lastTimestamp: new Date() });

    expect(batchTrigger).toHaveBeenCalledTimes(1);
    const payloads = batchTrigger.mock.calls[0][0] as Array<{
      payload: {
        organizationId: string;
        organizationName: string;
        tasks: Array<{ taskId: string }>;
      };
    }>;
    expect(payloads).toHaveLength(2);

    const org1 = payloads.find((p) => p.payload.organizationId === 'org1');
    expect(org1?.payload.organizationName).toBe('Org One');
    expect(org1?.payload.tasks.map((t) => t.taskId)).toEqual(['task_org1']);

    const org2 = payloads.find((p) => p.payload.organizationId === 'org2');
    expect(org2?.payload.tasks.map((t) => t.taskId)).toEqual(['task_org2']);
  });
});
