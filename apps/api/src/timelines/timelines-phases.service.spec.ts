import { NotFoundException } from '@nestjs/common';
import { TimelinesPhasesService } from './timelines-phases.service';

jest.mock('@db', () => ({
  db: {
    timelineInstance: {
      findUnique: jest.fn(),
    },
    timelinePhase: {
      update: jest.fn(),
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
}));

import { db } from '@db';

const mockDb = db as jest.Mocked<typeof db>;

describe('TimelinesPhasesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('auto-completes AUTO_UPLOAD phase when documentUrl is provided', async () => {
    const lifecycle = {
      completePhase: jest.fn().mockResolvedValue({ id: 'phase_1', status: 'COMPLETED' }),
    };
    const service = new TimelinesPhasesService(lifecycle as any);

    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue({
      id: 'tli_1',
      organizationId: 'org_1',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      phases: [
        {
          id: 'phase_1',
          completionType: 'AUTO_UPLOAD',
          status: 'IN_PROGRESS',
          durationWeeks: 2,
          startDate: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    });
    (mockDb.timelinePhase.update as jest.Mock).mockResolvedValue({
      id: 'phase_1',
      completionType: 'AUTO_UPLOAD',
      status: 'IN_PROGRESS',
    });

    const result = await service.updatePhase('tli_1', 'phase_1', 'org_1', {
      documentUrl: 'https://files.example.com/final-report.pdf',
    });

    expect(lifecycle.completePhase).toHaveBeenCalledWith('tli_1', 'phase_1', 'org_1');
    expect(result).toEqual({ id: 'phase_1', status: 'COMPLETED' });
  });

  it('does not auto-complete MANUAL phase when documentUrl is provided', async () => {
    const lifecycle = {
      completePhase: jest.fn(),
    };
    const service = new TimelinesPhasesService(lifecycle as any);

    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue({
      id: 'tli_1',
      organizationId: 'org_1',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      phases: [
        {
          id: 'phase_1',
          completionType: 'MANUAL',
          status: 'IN_PROGRESS',
          durationWeeks: 2,
          startDate: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    });
    (mockDb.timelinePhase.update as jest.Mock).mockResolvedValue({
      id: 'phase_1',
      completionType: 'MANUAL',
      status: 'IN_PROGRESS',
    });

    const result = await service.updatePhase('tli_1', 'phase_1', 'org_1', {
      documentUrl: 'https://files.example.com/evidence.pdf',
    });

    expect(lifecycle.completePhase).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'phase_1',
      completionType: 'MANUAL',
      status: 'IN_PROGRESS',
    });
  });

  it('does not auto-complete AUTO_UPLOAD phase when timeline is locked', async () => {
    const lifecycle = {
      completePhase: jest.fn(),
    };
    const service = new TimelinesPhasesService(lifecycle as any);

    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue({
      id: 'tli_1',
      organizationId: 'org_1',
      lockedAt: new Date('2026-01-20T00:00:00.000Z'),
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      phases: [
        {
          id: 'phase_1',
          completionType: 'AUTO_UPLOAD',
          status: 'IN_PROGRESS',
          durationWeeks: 2,
          startDate: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    });
    (mockDb.timelinePhase.update as jest.Mock).mockResolvedValue({
      id: 'phase_1',
      completionType: 'AUTO_UPLOAD',
      status: 'IN_PROGRESS',
    });

    await service.updatePhase('tli_1', 'phase_1', 'org_1', {
      documentUrl: 'https://files.example.com/final-report.pdf',
    });

    expect(lifecycle.completePhase).not.toHaveBeenCalled();
  });

  it('updates locksTimelineOnComplete when provided', async () => {
    const lifecycle = {
      completePhase: jest.fn(),
    };
    const service = new TimelinesPhasesService(lifecycle as any);

    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue({
      id: 'tli_1',
      organizationId: 'org_1',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      phases: [
        {
          id: 'phase_1',
          completionType: 'MANUAL',
          status: 'IN_PROGRESS',
          durationWeeks: 2,
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          locksTimelineOnComplete: false,
        },
      ],
    });

    (mockDb.timelinePhase.update as jest.Mock).mockResolvedValue({
      id: 'phase_1',
      completionType: 'MANUAL',
      status: 'IN_PROGRESS',
      locksTimelineOnComplete: true,
    });

    const result = await service.updatePhase('tli_1', 'phase_1', 'org_1', {
      locksTimelineOnComplete: true,
    } as any);

    expect(mockDb.timelinePhase.update).toHaveBeenCalledWith({
      where: { id: 'phase_1' },
      data: expect.objectContaining({
        locksTimelineOnComplete: true,
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'phase_1',
        locksTimelineOnComplete: true,
      }),
    );
  });

  it('updates completionType when provided', async () => {
    const lifecycle = {
      completePhase: jest.fn(),
    };
    const service = new TimelinesPhasesService(lifecycle as any);

    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue({
      id: 'tli_1',
      organizationId: 'org_1',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      phases: [
        {
          id: 'phase_1',
          completionType: 'MANUAL',
          status: 'IN_PROGRESS',
          durationWeeks: 2,
          startDate: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    });
    (mockDb.timelinePhase.update as jest.Mock).mockResolvedValue({
      id: 'phase_1',
      completionType: 'AUTO_FINDINGS',
      status: 'IN_PROGRESS',
    });

    const result = await service.updatePhase('tli_1', 'phase_1', 'org_1', {
      completionType: 'AUTO_FINDINGS',
    } as any);

    expect(mockDb.timelinePhase.update).toHaveBeenCalledWith({
      where: { id: 'phase_1' },
      data: expect.objectContaining({
        completionType: 'AUTO_FINDINGS',
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'phase_1',
        completionType: 'AUTO_FINDINGS',
      }),
    );
  });

  it('throws when timeline instance is missing', async () => {
    const service = new TimelinesPhasesService({ completePhase: jest.fn() } as any);
    (mockDb.timelineInstance.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.updatePhase('missing', 'phase_1', 'org_1', { name: 'Updated' }),
    ).rejects.toThrow(NotFoundException);
  });
});
