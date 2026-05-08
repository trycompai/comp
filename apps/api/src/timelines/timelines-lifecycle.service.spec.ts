import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TimelinesLifecycleService } from './timelines-lifecycle.service';

jest.mock('@db', () => ({
  db: {
    timelineInstance: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    timelinePhase: {
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  TimelineStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
  },
  TimelinePhaseStatus: {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
  },
}));

jest.mock('./timelines-slack.helper', () => ({
  notifyPhaseCompleted: jest.fn(),
  notifyTimelineCompleted: jest.fn(),
}));

import { db } from '@db';

const mockDb = db as jest.Mocked<typeof db>;

describe('TimelinesLifecycleService', () => {
  let service: TimelinesLifecycleService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TimelinesLifecycleService();
  });

  it('activates a draft timeline and marks only first phase as IN_PROGRESS', async () => {
    const instance = {
      id: 'tli_1',
      organizationId: 'org_1',
      status: 'DRAFT',
      phases: [
        {
          id: 'p1',
          orderIndex: 0,
          durationWeeks: 2,
          datesPinned: false,
          startDate: null,
          endDate: null,
        },
        {
          id: 'p2',
          orderIndex: 1,
          durationWeeks: 3,
          datesPinned: false,
          startDate: null,
          endDate: null,
        },
      ],
    };

    const tx = {
      timelinePhase: { update: jest.fn() },
      timelineInstance: {
        update: jest.fn().mockResolvedValue({ id: 'tli_1', status: 'ACTIVE' }),
      },
    };

    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue(instance);
    (mockDb.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(tx));

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    await service.activate('tli_1', 'org_1', startDate);

    expect(tx.timelinePhase.update).toHaveBeenCalledTimes(2);
    expect(tx.timelinePhase.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ status: 'IN_PROGRESS' }),
      }),
    );
    expect(tx.timelinePhase.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'p2' },
        data: expect.objectContaining({ status: 'PENDING' }),
      }),
    );
  });

  it('shifts only eligible phases on resume', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-08T00:00:00.000Z'));

    const pausedAt = new Date('2026-01-01T00:00:00.000Z');
    const instance = {
      id: 'tli_1',
      organizationId: 'org_1',
      status: 'PAUSED',
      pausedAt,
      phases: [
        {
          id: 'shift_me',
          status: 'PENDING',
          datesPinned: false,
          startDate: new Date('2026-01-02T00:00:00.000Z'),
          endDate: new Date('2026-01-09T00:00:00.000Z'),
        },
        {
          id: 'completed',
          status: 'COMPLETED',
          datesPinned: false,
          startDate: new Date('2026-01-02T00:00:00.000Z'),
          endDate: new Date('2026-01-09T00:00:00.000Z'),
        },
        {
          id: 'pinned',
          status: 'PENDING',
          datesPinned: true,
          startDate: new Date('2026-01-02T00:00:00.000Z'),
          endDate: new Date('2026-01-09T00:00:00.000Z'),
        },
        {
          id: 'no_dates',
          status: 'PENDING',
          datesPinned: false,
          startDate: null,
          endDate: null,
        },
      ],
    };

    const tx = {
      timelinePhase: { update: jest.fn() },
      timelineInstance: {
        update: jest.fn().mockResolvedValue({ id: 'tli_1', status: 'ACTIVE' }),
      },
    };

    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue(instance);
    (mockDb.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(tx));

    await service.resume('tli_1', 'org_1');

    expect(tx.timelinePhase.update).toHaveBeenCalledTimes(1);
    expect(tx.timelinePhase.update).toHaveBeenCalledWith({
      where: { id: 'shift_me' },
      data: {
        startDate: new Date('2026-01-09T00:00:00.000Z'),
        endDate: new Date('2026-01-16T00:00:00.000Z'),
      },
    });

    jest.useRealTimers();
  });

  it('throws when completing a phase that is not IN_PROGRESS', async () => {
    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue({
      id: 'tli_1',
      organizationId: 'org_1',
      phases: [
        { id: 'p1', orderIndex: 0, status: 'IN_PROGRESS' },
        { id: 'p2', orderIndex: 1, status: 'PENDING' },
      ],
    });

    await expect(
      service.completePhase('tli_1', 'p2', 'org_1', 'usr_1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when prior phases are not completed', async () => {
    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue({
      id: 'tli_1',
      organizationId: 'org_1',
      phases: [
        { id: 'p1', orderIndex: 0, status: 'PENDING' },
        { id: 'p2', orderIndex: 1, status: 'IN_PROGRESS' },
      ],
    });

    await expect(
      service.completePhase('tli_1', 'p2', 'org_1', 'usr_1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks timeline completed when last phase is completed', async () => {
    const tx = {
      timelinePhase: {
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            orderIndex: 0,
            status: 'COMPLETED',
            durationWeeks: 2,
            datesPinned: false,
            startDate: new Date('2026-01-01T00:00:00.000Z'),
            endDate: new Date('2026-01-08T00:00:00.000Z'),
          },
        ]),
        count: jest.fn().mockResolvedValue(0),
      },
      timelineInstance: {
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({
          id: 'tli_1',
          status: 'COMPLETED',
          phases: [{ id: 'p1', status: 'COMPLETED' }],
          organization: { id: 'org_1', name: 'Acme' },
          template: { id: 'tml_1', name: 'SOC 2 Type 2' },
          frameworkInstance: { framework: { id: 'frk_1', name: 'SOC 2' } },
        }),
      },
    };

    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue({
      id: 'tli_1',
      organizationId: 'org_1',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      phases: [
        {
          id: 'p1',
          name: 'Final Report',
          completionType: 'AUTO_UPLOAD',
          orderIndex: 0,
          status: 'IN_PROGRESS',
          durationWeeks: 2,
          datesPinned: false,
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          endDate: new Date('2099-01-15T00:00:00.000Z'),
        },
      ],
    });
    (mockDb.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(tx));

    await service.completePhase('tli_1', 'p1', 'org_1', 'usr_1');

    expect(tx.timelineInstance.update).toHaveBeenCalledWith({
      where: { id: 'tli_1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        completedAt: expect.any(Date),
        lockedAt: expect.any(Date),
        lockedById: 'usr_1',
      }),
    });
    expect(tx.timelinePhase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedById: 'usr_1',
          datesPinned: true,
          endDate: expect.any(Date),
        }),
      }),
    );
  });

  it('locks timeline when completing a phase flagged to lock on completion', async () => {
    const tx = {
      timelinePhase: {
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            orderIndex: 0,
            status: 'COMPLETED',
            durationWeeks: 2,
            datesPinned: false,
            startDate: new Date('2026-01-01T00:00:00.000Z'),
            endDate: new Date('2026-01-08T00:00:00.000Z'),
          },
          {
            id: 'p2',
            orderIndex: 1,
            status: 'PENDING',
            durationWeeks: 2,
            datesPinned: false,
            startDate: new Date('2026-01-08T00:00:00.000Z'),
            endDate: new Date('2026-01-15T00:00:00.000Z'),
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
      timelineInstance: {
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({
          id: 'tli_1',
          status: 'ACTIVE',
          phases: [],
          organization: { id: 'org_1', name: 'Acme' },
          template: { id: 'tml_1', name: 'SOC 2 Type 2' },
          frameworkInstance: { framework: { id: 'frk_1', name: 'SOC 2' } },
        }),
      },
    };

    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue({
      id: 'tli_1',
      organizationId: 'org_1',
      lockedAt: null,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      phases: [
        {
          id: 'p1',
          name: 'Observation',
          completionType: 'MANUAL',
          locksTimelineOnComplete: true,
          orderIndex: 0,
          status: 'IN_PROGRESS',
          durationWeeks: 2,
          datesPinned: false,
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          endDate: new Date('2099-01-15T00:00:00.000Z'),
        },
        {
          id: 'p2',
          name: 'Audit Review',
          completionType: 'MANUAL',
          locksTimelineOnComplete: false,
          orderIndex: 1,
          status: 'PENDING',
          durationWeeks: 2,
          datesPinned: false,
          startDate: new Date('2026-01-15T00:00:00.000Z'),
          endDate: new Date('2099-01-29T00:00:00.000Z'),
        },
      ],
    });
    (mockDb.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(tx));

    await service.completePhase('tli_1', 'p1', 'org_1', 'usr_1');

    expect(tx.timelineInstance.update).toHaveBeenCalledWith({
      where: { id: 'tli_1' },
      data: {
        lockedAt: expect.any(Date),
        lockedById: 'usr_1',
        unlockedAt: null,
        unlockedById: null,
        unlockReason: null,
      },
    });
  });

  it('unlocks a locked timeline and stores unlock metadata', async () => {
    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue({
      id: 'tli_1',
      organizationId: 'org_1',
      status: 'ACTIVE',
      lockedAt: new Date('2026-01-10T00:00:00.000Z'),
    });
    (mockDb.timelineInstance.update as jest.Mock).mockResolvedValue({
      id: 'tli_1',
      lockedAt: null,
      unlockedById: 'usr_admin',
      unlockReason: 'Audit scope changed',
    });

    await service.unlock('tli_1', 'org_1', 'usr_admin', 'Audit scope changed');

    expect(mockDb.timelineInstance.update).toHaveBeenCalledWith({
      where: { id: 'tli_1' },
      data: {
        lockedAt: null,
        lockedById: null,
        unlockedAt: expect.any(Date),
        unlockedById: 'usr_admin',
        unlockReason: 'Audit scope changed',
      },
      include: expect.any(Object),
    });
  });

  it('throws when unlocking a timeline that is not locked', async () => {
    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue({
      id: 'tli_1',
      organizationId: 'org_1',
      status: 'ACTIVE',
      lockedAt: null,
    });

    await expect(
      service.unlock('tli_1', 'org_1', 'usr_admin', 'Need to adjust phase data'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when unlocking a completed timeline', async () => {
    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue({
      id: 'tli_1',
      organizationId: 'org_1',
      status: 'COMPLETED',
      lockedAt: new Date('2026-01-10T00:00:00.000Z'),
    });

    await expect(
      service.unlock('tli_1', 'org_1', 'usr_admin', 'Need to adjust phase data'),
    ).rejects.toThrow(BadRequestException);

    expect(mockDb.timelineInstance.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException for missing timeline on activate', async () => {
    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.activate('missing', 'org_1', new Date('2026-01-01')),
    ).rejects.toThrow(NotFoundException);
  });
});
