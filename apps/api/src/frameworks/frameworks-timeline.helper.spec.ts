import { checkAutoCompletePhases } from './frameworks-timeline.helper';

jest.mock('@db', () => ({
  db: {
    timelinePhase: {
      findMany: jest.fn(),
    },
    frameworkInstance: {
      findMany: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
    },
    finding: {
      findMany: jest.fn(),
    },
  },
  PhaseCompletionType: {
    AUTO_TASKS: 'AUTO_TASKS',
    AUTO_POLICIES: 'AUTO_POLICIES',
    AUTO_PEOPLE: 'AUTO_PEOPLE',
    AUTO_FINDINGS: 'AUTO_FINDINGS',
    AUTO_UPLOAD: 'AUTO_UPLOAD',
    MANUAL: 'MANUAL',
  },
  TimelinePhaseStatus: {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
  },
  TimelineStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
  },
  FindingStatus: {
    open: 'open',
    ready_for_review: 'ready_for_review',
    needs_revision: 'needs_revision',
    closed: 'closed',
  },
  FindingType: {
    soc2: 'soc2',
    iso27001: 'iso27001',
  },
}));

jest.mock('./frameworks-scores.helper', () => ({
  getOverviewScores: jest.fn().mockResolvedValue({
    policies: { total: 1, published: 0 },
    tasks: { total: 1, done: 0 },
    people: { total: 1, completed: 0 },
  }),
}));

import { db } from '@db';

const mockDb = db as jest.Mocked<typeof db>;

describe('frameworks-timeline.helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('auto-completes AUTO_FINDINGS phase only when all findings for that framework type are closed', async () => {
    const timelinesService = {
      completePhase: jest.fn().mockResolvedValue({ id: 'tli_soc2' }),
    };

    (mockDb.timelinePhase.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'phase_soc2',
        completionType: 'AUTO_FINDINGS',
        startDate: new Date('2026-04-10T00:00:00.000Z'),
        instance: {
          id: 'tli_soc2',
          organizationId: 'org_1',
          frameworkInstanceId: 'fi_soc2',
          frameworkInstance: { framework: { name: 'SOC 2' } },
        },
      },
      {
        id: 'phase_iso',
        completionType: 'AUTO_FINDINGS',
        startDate: new Date('2026-04-10T00:00:00.000Z'),
        instance: {
          id: 'tli_iso',
          organizationId: 'org_1',
          frameworkInstanceId: 'fi_iso',
          frameworkInstance: { framework: { name: 'ISO 27001' } },
        },
      },
    ]);
    (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue([
      { id: 'fi_soc2', requirementsMapped: [] },
      { id: 'fi_iso', requirementsMapped: [] },
    ]);
    (mockDb.finding.findMany as jest.Mock).mockResolvedValue([
      {
        type: 'soc2',
        status: 'closed',
        createdAt: new Date('2026-04-11T00:00:00.000Z'),
      },
      {
        type: 'iso27001',
        status: 'open',
        createdAt: new Date('2026-04-11T00:00:00.000Z'),
      },
    ]);

    await checkAutoCompletePhases({
      organizationId: 'org_1',
      timelinesService: timelinesService as any,
    });

    expect(timelinesService.completePhase).toHaveBeenCalledTimes(1);
    expect(timelinesService.completePhase).toHaveBeenCalledWith(
      'tli_soc2',
      'phase_soc2',
      'org_1',
    );
  });

  it('does not auto-complete AUTO_FINDINGS phase when no findings exist for that framework type', async () => {
    const timelinesService = {
      completePhase: jest.fn().mockResolvedValue({ id: 'tli_soc2' }),
    };

    (mockDb.timelinePhase.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'phase_soc2',
        completionType: 'AUTO_FINDINGS',
        startDate: new Date('2026-04-10T00:00:00.000Z'),
        instance: {
          id: 'tli_soc2',
          organizationId: 'org_1',
          frameworkInstanceId: 'fi_soc2',
          frameworkInstance: { framework: { name: 'SOC 2' } },
        },
      },
    ]);
    (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue([
      { id: 'fi_soc2', requirementsMapped: [] },
    ]);
    (mockDb.finding.findMany as jest.Mock).mockResolvedValue([]);

    await checkAutoCompletePhases({
      organizationId: 'org_1',
      timelinesService: timelinesService as any,
    });

    expect(timelinesService.completePhase).not.toHaveBeenCalled();
  });

  it('maps SOC 2 v.1 AUTO_FINDINGS phases to SOC 2 finding type', async () => {
    const timelinesService = {
      completePhase: jest.fn().mockResolvedValue({ id: 'tli_soc2_v1' }),
    };

    (mockDb.timelinePhase.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'phase_soc2_v1',
        completionType: 'AUTO_FINDINGS',
        startDate: new Date('2026-04-10T00:00:00.000Z'),
        instance: {
          id: 'tli_soc2_v1',
          organizationId: 'org_1',
          frameworkInstanceId: 'fi_soc2_v1',
          frameworkInstance: { framework: { name: 'SOC 2 v.1' } },
        },
      },
    ]);
    (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue([
      { id: 'fi_soc2_v1', requirementsMapped: [] },
    ]);
    (mockDb.finding.findMany as jest.Mock).mockResolvedValue([
      {
        type: 'soc2',
        status: 'closed',
        createdAt: new Date('2026-04-11T00:00:00.000Z'),
      },
    ]);

    await checkAutoCompletePhases({
      organizationId: 'org_1',
      timelinesService: timelinesService as any,
    });

    expect(timelinesService.completePhase).toHaveBeenCalledWith(
      'tli_soc2_v1',
      'phase_soc2_v1',
      'org_1',
    );
  });
});
