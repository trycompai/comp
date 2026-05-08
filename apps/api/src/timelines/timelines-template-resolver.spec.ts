import {
  findTemplateForCycle,
  createInstanceFromTemplate,
} from './timelines-template-resolver';

jest.mock('@db', () => ({
  db: {
    timelineTemplate: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    timelineInstance: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    timelinePhase: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  TimelineStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
  },
  PhaseCompletionType: {
    AUTO_TASKS: 'AUTO_TASKS',
    AUTO_POLICIES: 'AUTO_POLICIES',
    AUTO_PEOPLE: 'AUTO_PEOPLE',
    AUTO_UPLOAD: 'AUTO_UPLOAD',
    MANUAL: 'MANUAL',
  },
}));

import { db } from '@db';

const mockDb = db as jest.Mocked<typeof db>;

describe('timelines-template-resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns exact cycle template when available', async () => {
    (mockDb.timelineTemplate.findUnique as jest.Mock).mockResolvedValue({
      id: 'tml_2',
      cycleNumber: 2,
    });

    const result = await findTemplateForCycle('frk_1', 2, 'soc2_type2');

    expect(result).toEqual({ id: 'tml_2', cycleNumber: 2 });
    expect(mockDb.timelineTemplate.findUnique).toHaveBeenCalledWith({
      where: {
        frameworkId_trackKey_cycleNumber: {
          frameworkId: 'frk_1',
          trackKey: 'soc2_type2',
          cycleNumber: 2,
        },
      },
      include: { phases: { orderBy: { orderIndex: 'asc' } } },
    });
    expect(mockDb.timelineTemplate.findFirst).not.toHaveBeenCalled();
  });

  it('falls back to highest template with cycle <= requested cycle', async () => {
    (mockDb.timelineTemplate.findUnique as jest.Mock).mockResolvedValue(null);
    (mockDb.timelineTemplate.findFirst as jest.Mock).mockResolvedValue({
      id: 'tml_2',
      cycleNumber: 2,
    });

    const result = await findTemplateForCycle('frk_1', 5, 'soc2_type2');

    expect(mockDb.timelineTemplate.findFirst).toHaveBeenCalledWith({
      where: {
        frameworkId: 'frk_1',
        trackKey: 'soc2_type2',
        cycleNumber: { lte: 5 },
      },
      orderBy: { cycleNumber: 'desc' },
      include: { phases: { orderBy: { orderIndex: 'asc' } } },
    });
    expect(result).toEqual({ id: 'tml_2', cycleNumber: 2 });
  });

  it('snapshots locksTimelineOnComplete from template phases to instance phases', async () => {
    const tx = {
      timelineInstance: {
        create: jest.fn().mockResolvedValue({ id: 'tli_1' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'tli_1',
          phases: [
            { id: 'p1', locksTimelineOnComplete: true },
            { id: 'p2', locksTimelineOnComplete: false },
          ],
        }),
      },
      timelinePhase: {
        create: jest.fn(),
      },
    };

    (mockDb.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(tx));

    await createInstanceFromTemplate({
      organizationId: 'org_1',
      frameworkInstanceId: 'fi_1',
      cycleNumber: 2,
      template: {
        id: 'tml_1',
        phases: [
          {
            id: 'tpt_1',
            name: 'Observation',
            description: null,
            groupLabel: null,
            orderIndex: 0,
            defaultDurationWeeks: 4,
            completionType: 'MANUAL' as any,
            locksTimelineOnComplete: true,
          },
          {
            id: 'tpt_2',
            name: 'Auditor Review',
            description: null,
            groupLabel: null,
            orderIndex: 1,
            defaultDurationWeeks: 4,
            completionType: 'MANUAL' as any,
            locksTimelineOnComplete: false,
          },
        ],
      },
    });

    expect(tx.timelinePhase.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          phaseTemplateId: 'tpt_1',
          locksTimelineOnComplete: true,
        }),
      }),
    );
    expect(tx.timelinePhase.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          phaseTemplateId: 'tpt_2',
          locksTimelineOnComplete: false,
        }),
      }),
    );
  });
});
