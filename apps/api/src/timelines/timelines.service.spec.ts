import { TimelinesService } from './timelines.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('@db', () => ({
  db: {
    frameworkInstance: {
      findMany: jest.fn(),
    },
    timelineInstance: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    timelineTemplate: {
      findUnique: jest.fn(),
    },
    timelinePhase: {
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  TimelinePhaseStatus: {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
  },
}));

jest.mock('../frameworks/frameworks-scores.helper', () => ({
  getOverviewScores: jest.fn(),
}));

jest.mock('./timelines-backfill.helper', () => ({
  backfillTimeline: jest.fn(),
}));

jest.mock('./timelines-template-resolver', () => ({
  resolveTemplate: jest.fn(),
  createInstanceFromTemplate: jest.fn(),
}));

import { db } from '@db';
import { getOverviewScores } from '../frameworks/frameworks-scores.helper';
import { createInstanceFromTemplate } from './timelines-template-resolver';
import { backfillTimeline } from './timelines-backfill.helper';

const mockDb = db as jest.Mocked<typeof db>;

function cloneTimeline<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('TimelinesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cascades AUTO_* phase completions when live metrics are already 100%', async () => {
    const orgId = 'org_1';
    const lifecycle = {
      activate: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      completePhase: jest.fn(),
    };

    const service = new TimelinesService(lifecycle as any);

    const timelineState = {
      id: 'tli_1',
      organizationId: orgId,
      frameworkInstanceId: 'fi_1',
      templateId: 'tml_1',
      cycleNumber: 2,
      status: 'ACTIVE',
      startDate: '2026-01-01T00:00:00.000Z',
      pausedAt: null,
      completedAt: null,
      phases: [
        {
          id: 'p1',
          name: 'Policies',
          orderIndex: 0,
          status: 'IN_PROGRESS',
          completionType: 'AUTO_POLICIES',
          completedAt: null,
        },
        {
          id: 'p2',
          name: 'Evidence',
          orderIndex: 1,
          status: 'PENDING',
          completionType: 'AUTO_TASKS',
          completedAt: null,
        },
        {
          id: 'p3',
          name: 'People',
          orderIndex: 2,
          status: 'PENDING',
          completionType: 'AUTO_PEOPLE',
          completedAt: null,
        },
        {
          id: 'p4',
          name: 'Auditor Review',
          orderIndex: 3,
          status: 'PENDING',
          completionType: 'MANUAL',
          completedAt: null,
        },
      ],
      frameworkInstance: { framework: { id: 'frk_1', name: 'SOC 2' } },
      template: { id: 'tml_1', name: 'SOC 2 Type 2' },
    };

    (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'fi_1',
        frameworkId: 'frk_1',
        framework: { id: 'frk_1', name: 'SOC 2' },
        timelineInstances: [{ id: 'tli_1' }],
      },
    ]);

    (mockDb.timelineInstance.findMany as jest.Mock).mockImplementation(() =>
      Promise.resolve([cloneTimeline(timelineState)]),
    );

    (getOverviewScores as jest.Mock).mockResolvedValue({
      policies: { total: 10, published: 10 },
      tasks: { total: 20, done: 20 },
      people: { total: 5, completed: 5 },
    });

    lifecycle.completePhase.mockImplementation(async (_instanceId: string, phaseId: string) => {
      const phase = timelineState.phases.find((p) => p.id === phaseId);
      if (!phase) return cloneTimeline(timelineState);

      phase.status = 'COMPLETED';
      phase.completedAt = '2026-01-10T00:00:00.000Z';

      const nextPending = timelineState.phases.find((p) => p.status === 'PENDING');
      if (nextPending) {
        const allPriorComplete = timelineState.phases
          .filter((p) => p.orderIndex < nextPending.orderIndex)
          .every((p) => p.status === 'COMPLETED');

        if (allPriorComplete) {
          nextPending.status = 'IN_PROGRESS';
        }
      }

      return cloneTimeline(timelineState);
    });

    const result = await service.findAllForOrganization(orgId);

    expect(lifecycle.completePhase).toHaveBeenCalledTimes(3);
    expect(result[0].phases.map((p) => p.status)).toEqual([
      'COMPLETED',
      'COMPLETED',
      'COMPLETED',
      'IN_PROGRESS',
    ]);
  });

  it('does not auto-complete AUTO phases while a timeline is paused', async () => {
    const orgId = 'org_1';
    const lifecycle = {
      activate: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      completePhase: jest.fn(),
    };
    const service = new TimelinesService(lifecycle as any);

    const timelineState = {
      id: 'tli_paused',
      organizationId: orgId,
      frameworkInstanceId: 'fi_1',
      templateId: 'tml_1',
      cycleNumber: 2,
      status: 'PAUSED',
      startDate: '2026-01-01T00:00:00.000Z',
      pausedAt: '2026-01-10T00:00:00.000Z',
      completedAt: null,
      phases: [
        {
          id: 'p1',
          name: 'Policies',
          orderIndex: 0,
          status: 'IN_PROGRESS',
          completionType: 'AUTO_POLICIES',
          completedAt: null,
        },
      ],
      frameworkInstance: { framework: { id: 'frk_1', name: 'SOC 2' } },
      template: { id: 'tml_1', name: 'SOC 2 Type 2' },
    };

    (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'fi_1',
        frameworkId: 'frk_1',
        framework: { id: 'frk_1', name: 'SOC 2' },
        timelineInstances: [{ id: 'tli_paused' }],
      },
    ]);
    (mockDb.timelineInstance.findMany as jest.Mock).mockImplementation(() =>
      Promise.resolve([cloneTimeline(timelineState)]),
    );
    (getOverviewScores as jest.Mock).mockResolvedValue({
      policies: { total: 10, published: 10 },
      tasks: { total: 1, done: 1 },
      people: { total: 1, completed: 1 },
    });

    const result = await service.findAllForOrganization(orgId);

    expect(lifecycle.completePhase).not.toHaveBeenCalled();
    expect(result[0].phases[0].status).toBe('IN_PROGRESS');
  });

  it('records regressedAt when a completed AUTO phase drops below 100%', async () => {
    const orgId = 'org_1';
    const lifecycle = {
      activate: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      completePhase: jest.fn(),
    };
    const service = new TimelinesService(lifecycle as any);

    const timelineState = {
      id: 'tli_reopen',
      organizationId: orgId,
      frameworkInstanceId: 'fi_1',
      templateId: 'tml_1',
      cycleNumber: 2,
      status: 'ACTIVE',
      startDate: '2026-01-01T00:00:00.000Z',
      pausedAt: null,
      completedAt: null,
      phases: [
        {
          id: 'p1',
          name: 'Policies',
          orderIndex: 0,
          status: 'COMPLETED',
          completionType: 'AUTO_POLICIES',
          completedAt: '2026-01-03T00:00:00.000Z',
          regressedAt: null,
        },
      ],
      frameworkInstance: { framework: { id: 'frk_1', name: 'SOC 2' } },
      template: { id: 'tml_1', name: 'SOC 2 Type 2' },
    };

    (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'fi_1',
        frameworkId: 'frk_1',
        framework: { id: 'frk_1', name: 'SOC 2' },
        timelineInstances: [{ id: 'tli_reopen' }],
      },
    ]);
    (mockDb.timelineInstance.findMany as jest.Mock).mockImplementation(() =>
      Promise.resolve([cloneTimeline(timelineState)]),
    );
    (mockDb.timelinePhase.update as jest.Mock).mockImplementation(async ({ where, data }: any) => {
      const phase = timelineState.phases.find((p) => p.id === where.id);
      if (!phase) return null;
      Object.assign(phase, data);
      return phase;
    });
    (getOverviewScores as jest.Mock).mockResolvedValue({
      policies: { total: 10, published: 8 },
      tasks: { total: 1, done: 1 },
      people: { total: 1, completed: 1 },
    });

    const result = await service.findAllForOrganization(orgId);

    expect(mockDb.timelinePhase.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { regressedAt: expect.any(Date) },
    });
    expect(result[0].phases[0].status).toBe('COMPLETED');
    expect(result[0].phases[0].regressedAt).toBeTruthy();
  });

  it('re-opens AUTO_PEOPLE immediately when live people score drops below 100%', async () => {
    const orgId = 'org_1';
    const lifecycle = {
      activate: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      completePhase: jest.fn(),
    };
    const service = new TimelinesService(lifecycle as any);

    const timelineState = {
      id: 'tli_people_reopen',
      organizationId: orgId,
      frameworkInstanceId: 'fi_1',
      templateId: 'tml_1',
      cycleNumber: 1,
      status: 'ACTIVE',
      lockedAt: null,
      startDate: '2026-01-01T00:00:00.000Z',
      pausedAt: null,
      completedAt: null,
      phases: [
        {
          id: 'p1',
          name: 'People',
          orderIndex: 0,
          status: 'COMPLETED',
          completionType: 'AUTO_PEOPLE',
          completedAt: '2026-01-10T00:00:00.000Z',
          regressedAt: null,
          completedById: null,
          readyForReview: false,
          readyForReviewAt: null,
        },
        {
          id: 'p2',
          name: 'Auditor Review',
          orderIndex: 1,
          status: 'PENDING',
          completionType: 'MANUAL',
          completedAt: null,
          regressedAt: null,
          completedById: null,
          readyForReview: false,
          readyForReviewAt: null,
        },
      ],
      frameworkInstance: { framework: { id: 'frk_1', name: 'SOC 2' } },
      template: { id: 'tml_1', name: 'SOC 2 Type 1' },
    };

    (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'fi_1',
        frameworkId: 'frk_1',
        framework: { id: 'frk_1', name: 'SOC 2' },
        timelineInstances: [{ id: 'tli_people_reopen' }],
      },
    ]);
    (mockDb.timelineInstance.findMany as jest.Mock).mockImplementation(() =>
      Promise.resolve([cloneTimeline(timelineState)]),
    );

    (mockDb.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        timelinePhase: {
          findMany: jest.fn(async () => cloneTimeline(timelineState.phases)),
          update: jest.fn(async ({ where, data }: any) => {
            const phase = timelineState.phases.find((p) => p.id === where.id);
            if (!phase) return null;
            Object.assign(phase, data);
            return phase;
          }),
        },
      };
      return fn(tx);
    });

    (getOverviewScores as jest.Mock).mockResolvedValue({
      policies: { total: 10, published: 10 },
      tasks: { total: 1, done: 1 },
      people: { total: 2, completed: 1 },
    });

    const result = await service.findAllForOrganization(orgId);

    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
    expect(result[0].phases.map((phase) => phase.status)).toEqual([
      'IN_PROGRESS',
      'PENDING',
    ]);
    expect(result[0].phases[0].regressedAt).toBeNull();
  });

  it('re-opens a regressed AUTO phase after the 24-hour grace window', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-15T00:00:00.000Z'));

    const orgId = 'org_1';
    const lifecycle = {
      activate: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      completePhase: jest.fn(),
    };
    const service = new TimelinesService(lifecycle as any);

    const timelineState = {
      id: 'tli_reopen_after_grace',
      organizationId: orgId,
      frameworkInstanceId: 'fi_1',
      templateId: 'tml_1',
      cycleNumber: 2,
      status: 'ACTIVE',
      lockedAt: null,
      startDate: '2026-01-01T00:00:00.000Z',
      pausedAt: null,
      completedAt: null,
      phases: [
        {
          id: 'p1',
          name: 'Policies',
          orderIndex: 0,
          status: 'COMPLETED',
          completionType: 'AUTO_POLICIES',
          completedAt: '2026-01-03T00:00:00.000Z',
          regressedAt: '2026-02-10T00:00:00.000Z',
          completedById: 'usr_1',
          readyForReview: true,
          readyForReviewAt: '2026-01-03T01:00:00.000Z',
        },
        {
          id: 'p2',
          name: 'Auditor Review',
          orderIndex: 1,
          status: 'COMPLETED',
          completionType: 'MANUAL',
          completedAt: '2026-01-20T00:00:00.000Z',
          regressedAt: null,
          completedById: 'usr_2',
          readyForReview: false,
          readyForReviewAt: null,
        },
      ],
      frameworkInstance: { framework: { id: 'frk_1', name: 'SOC 2' } },
      template: { id: 'tml_1', name: 'SOC 2 Type 2' },
    };

    (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'fi_1',
        frameworkId: 'frk_1',
        framework: { id: 'frk_1', name: 'SOC 2' },
        timelineInstances: [{ id: 'tli_reopen_after_grace' }],
      },
    ]);
    (mockDb.timelineInstance.findMany as jest.Mock).mockImplementation(() =>
      Promise.resolve([cloneTimeline(timelineState)]),
    );

    (mockDb.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        timelinePhase: {
          findMany: jest.fn(async () => cloneTimeline(timelineState.phases)),
          update: jest.fn(async ({ where, data }: any) => {
            const phase = timelineState.phases.find((p) => p.id === where.id);
            if (!phase) return null;
            Object.assign(phase, data);
            return phase;
          }),
        },
      };
      return fn(tx);
    });

    (getOverviewScores as jest.Mock).mockResolvedValue({
      policies: { total: 10, published: 8 },
      tasks: { total: 1, done: 1 },
      people: { total: 1, completed: 1 },
    });

    const result = await service.findAllForOrganization(orgId);

    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
    expect(result[0].phases.map((phase) => phase.status)).toEqual([
      'IN_PROGRESS',
      'PENDING',
    ]);
    expect(result[0].phases[0].regressedAt).toBeNull();
    jest.useRealTimers();
  });

  it('rejects starting next cycle when current timeline is not completed', async () => {
    const lifecycle = {
      activate: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      completePhase: jest.fn(),
    };
    const service = new TimelinesService(lifecycle as any);

    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'tli_1',
      frameworkInstanceId: 'fi_1',
      cycleNumber: 1,
      status: 'ACTIVE',
    } as any);

    await expect(service.startNextCycle('tli_1', 'org_1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects starting next cycle when next cycle already exists', async () => {
    const lifecycle = {
      activate: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      completePhase: jest.fn(),
    };
    const service = new TimelinesService(lifecycle as any);

    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'tli_1',
      frameworkInstanceId: 'fi_1',
      cycleNumber: 2,
      status: 'COMPLETED',
    } as any);
    (mockDb.timelineInstance.findFirst as jest.Mock).mockResolvedValue({
      id: 'existing_cycle_3',
    });

    await expect(service.startNextCycle('tli_1', 'org_1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates next cycle from template when eligible', async () => {
    const lifecycle = {
      activate: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      completePhase: jest.fn(),
    };
    const service = new TimelinesService(lifecycle as any);

    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'tli_1',
      frameworkInstanceId: 'fi_1',
      cycleNumber: 2,
      status: 'COMPLETED',
    } as any);
    (mockDb.timelineInstance.findFirst as jest.Mock).mockResolvedValue(null);

    const createSpy = jest
      .spyOn(service, 'createFromTemplate')
      .mockResolvedValue({ id: 'tli_3', cycleNumber: 3 } as any);

    const result = await service.startNextCycle('tli_1', 'org_1');

    expect(createSpy).toHaveBeenCalledWith({
      organizationId: 'org_1',
      frameworkInstanceId: 'fi_1',
      cycleNumber: 3,
      trackKey: 'primary',
    });
    expect(result).toEqual({ id: 'tli_3', cycleNumber: 3 });
  });

  it('uses explicit template progression when current template defines nextTemplateKey', async () => {
    const lifecycle = {
      activate: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      completePhase: jest.fn(),
    };
    const service = new TimelinesService(lifecycle as any);

    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'tli_2',
      frameworkInstanceId: 'fi_1',
      cycleNumber: 2,
      trackKey: 'soc2_type2',
      status: 'COMPLETED',
      template: {
        id: 'tml_soc2_y1',
        frameworkId: 'frk_soc2',
        trackKey: 'soc2_type2',
        templateKey: 'soc2_type2_year1',
        nextTemplateKey: 'soc2_type2_renewal',
      },
    } as any);

    (mockDb.timelineInstance.findFirst as jest.Mock).mockResolvedValue(null);
    (mockDb.timelineTemplate.findUnique as jest.Mock).mockResolvedValue({
      id: 'tml_soc2_renewal',
      phases: [],
    });
    (createInstanceFromTemplate as jest.Mock).mockResolvedValue({
      id: 'tli_3',
      cycleNumber: 3,
    });

    const createSpy = jest
      .spyOn(service, 'createFromTemplate')
      .mockResolvedValue({ id: 'fallback', cycleNumber: 3 } as any);

    const result = await service.startNextCycle('tli_2', 'org_1');

    expect(mockDb.timelineTemplate.findUnique).toHaveBeenCalledWith({
      where: {
        frameworkId_templateKey: {
          frameworkId: 'frk_soc2',
          templateKey: 'soc2_type2_renewal',
        },
      },
      include: { phases: { orderBy: { orderIndex: 'asc' } } },
    });
    expect(createSpy).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ id: 'tli_3', cycleNumber: 3 }));
  });

  it('checks for existing next cycle within the same track only', async () => {
    const lifecycle = {
      activate: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      completePhase: jest.fn(),
    };
    const service = new TimelinesService(lifecycle as any);

    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'tli_type2_1',
      frameworkInstanceId: 'fi_1',
      cycleNumber: 1,
      trackKey: 'soc2_type2',
      status: 'COMPLETED',
      template: {
        id: 'tml_soc2_type2_y1',
        frameworkId: 'frk_soc2',
        trackKey: 'soc2_type2',
        templateKey: 'soc2_type2_year1',
        nextTemplateKey: 'soc2_type2_renewal',
      },
    } as any);
    (mockDb.timelineInstance.findFirst as jest.Mock).mockResolvedValue(null);
    (mockDb.timelineTemplate.findUnique as jest.Mock).mockResolvedValue({
      id: 'tml_soc2_renewal',
      trackKey: 'soc2_type2',
      phases: [],
    });
    (createInstanceFromTemplate as jest.Mock).mockResolvedValue({
      id: 'tli_type2_2',
      cycleNumber: 2,
      trackKey: 'soc2_type2',
    });

    await service.startNextCycle('tli_type2_1', 'org_1');

    expect(mockDb.timelineInstance.findFirst).toHaveBeenCalledWith({
      where: {
        frameworkInstanceId: 'fi_1',
        trackKey: 'soc2_type2',
        cycleNumber: 2,
      },
    });
  });

  it('resets timeline instance and phases back to draft baseline', async () => {
    const lifecycle = {
      activate: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      completePhase: jest.fn(),
    };
    const service = new TimelinesService(lifecycle as any);

    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'tli_1',
      phases: [
        { id: 'p1' },
        { id: 'p2' },
      ],
    } as any);

    const tx = {
      timelinePhase: { update: jest.fn() },
      timelineInstance: { update: jest.fn() },
    };
    (mockDb.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(tx));

    const refreshed = { id: 'tli_1', status: 'DRAFT' };
    jest.spyOn(service, 'findOne').mockResolvedValueOnce({
      id: 'tli_1',
      phases: [{ id: 'p1' }, { id: 'p2' }],
    } as any).mockResolvedValueOnce(refreshed as any);

    const result = await service.resetInstance('tli_1', 'org_1');

    expect(tx.timelinePhase.update).toHaveBeenCalledTimes(2);
    expect(tx.timelinePhase.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: expect.objectContaining({ regressedAt: null }),
    });
    expect(tx.timelineInstance.update).toHaveBeenCalledWith({
      where: { id: 'tli_1' },
      data: {
        status: 'DRAFT',
        startDate: null,
        pausedAt: null,
        lockedAt: null,
        lockedById: null,
        unlockedAt: null,
        unlockedById: null,
        unlockReason: null,
        completedAt: null,
      },
    });
    expect(result).toEqual(refreshed);
  });

  it('recreate clears grace periods by bypassing regression grace on refresh', async () => {
    const lifecycle = {
      activate: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      completePhase: jest.fn(),
    };
    const service = new TimelinesService(lifecycle as any);

    (mockDb.timelineInstance.findMany as jest.Mock).mockResolvedValue([
      { id: 'tli_1' },
    ]);
    (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'fi_1',
        frameworkId: 'frk_1',
        framework: { id: 'frk_1', name: 'SOC 2' },
        timelineInstances: [],
      },
    ]);

    const findAllSpy = jest
      .spyOn(service, 'findAllForOrganization')
      .mockResolvedValue([] as any);

    await service.recreateAllForOrganization('org_1');

    expect(backfillTimeline).toHaveBeenCalledWith({
      organizationId: 'org_1',
      frameworkInstance: expect.objectContaining({ id: 'fi_1' }),
      forceRefresh: true,
    });
    expect(findAllSpy).toHaveBeenLastCalledWith('org_1', {
      bypassRegressionGrace: true,
    });
  });
});
