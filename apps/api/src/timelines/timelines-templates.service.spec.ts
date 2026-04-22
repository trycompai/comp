import { TimelinesTemplatesService } from './timelines-templates.service';

jest.mock('@db', () => ({
  db: {
    frameworkEditorFramework: {
      findMany: jest.fn(),
    },
    timelineTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    timelinePhaseTemplate: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  PhaseCompletionType: {
    AUTO_TASKS: 'AUTO_TASKS',
    AUTO_POLICIES: 'AUTO_POLICIES',
    AUTO_PEOPLE: 'AUTO_PEOPLE',
    AUTO_UPLOAD: 'AUTO_UPLOAD',
    MANUAL: 'MANUAL',
  },
}));

jest.mock('./timelines-template-resolver', () => ({
  upsertDefaultTemplate: jest.fn(),
}));

jest.mock('./default-templates', () => ({
  getDefaultTemplatesForFramework: jest.fn(),
  GENERIC_DEFAULT_TIMELINE_TEMPLATE: {
    frameworkName: '*',
    name: 'Baseline Compliance Timeline',
    cycleNumber: 1,
    phases: [
      {
        name: 'Scoping & Planning',
        description: 'Define scope, owners, and audit goals for this cycle.',
        orderIndex: 0,
        defaultDurationWeeks: 2,
        completionType: 'MANUAL',
      },
    ],
  },
}));

import { db } from '@db';
import { upsertDefaultTemplate } from './timelines-template-resolver';
import { getDefaultTemplatesForFramework } from './default-templates';

const mockDb = db as jest.Mocked<typeof db>;

describe('TimelinesTemplatesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('seeds framework-specific defaults for all frameworks before listing templates', async () => {
    const service = new TimelinesTemplatesService();

    (mockDb.frameworkEditorFramework.findMany as jest.Mock).mockResolvedValue([
      { id: 'frk_soc2', name: 'SOC2' },
      { id: 'frk_iso', name: 'ISO 27001' },
    ]);

    (getDefaultTemplatesForFramework as jest.Mock)
      .mockReturnValueOnce([
        { frameworkName: 'SOC 2', name: 'SOC 2 Type 1', cycleNumber: 1, phases: [] },
        { frameworkName: 'SOC 2', name: 'SOC 2 Type 2', cycleNumber: 2, phases: [] },
      ])
      .mockReturnValueOnce([
        { frameworkName: 'ISO27001', name: 'ISO 27001', cycleNumber: 1, phases: [] },
      ]);

    (mockDb.timelineTemplate.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.timelineTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    await service.findAll();

    expect(mockDb.frameworkEditorFramework.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true },
    });

    expect(upsertDefaultTemplate).toHaveBeenCalledWith(
      'frk_soc2',
      expect.objectContaining({ name: 'SOC 2 Type 1', cycleNumber: 1 }),
    );
    expect(upsertDefaultTemplate).toHaveBeenCalledWith(
      'frk_soc2',
      expect.objectContaining({ name: 'SOC 2 Type 2', cycleNumber: 2 }),
    );
    expect(upsertDefaultTemplate).toHaveBeenCalledWith(
      'frk_iso',
      expect.objectContaining({ name: 'ISO 27001', cycleNumber: 1 }),
    );
    expect(mockDb.timelineTemplate.findMany).toHaveBeenCalledWith({
      include: {
        phases: { orderBy: { orderIndex: 'asc' } },
        framework: true,
      },
      orderBy: [{ frameworkId: 'asc' }, { trackKey: 'asc' }, { cycleNumber: 'asc' }],
    });
  });

  it('seeds generic baseline template when framework has no specific default', async () => {
    const service = new TimelinesTemplatesService();

    (mockDb.frameworkEditorFramework.findMany as jest.Mock).mockResolvedValue([
      { id: 'frk_custom', name: 'My Custom Framework' },
    ]);
    (getDefaultTemplatesForFramework as jest.Mock).mockReturnValue([]);
    (mockDb.timelineTemplate.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.timelineTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    await service.findAll();

    expect(upsertDefaultTemplate).toHaveBeenCalledWith(
      'frk_custom',
      expect.objectContaining({
        cycleNumber: 1,
        frameworkName: 'My Custom Framework',
      }),
    );
  });

  it('does not overwrite existing templates when framework cycle already exists', async () => {
    const service = new TimelinesTemplatesService();

    (mockDb.frameworkEditorFramework.findMany as jest.Mock).mockResolvedValue([
      { id: 'frk_soc2', name: 'SOC2' },
    ]);
    (getDefaultTemplatesForFramework as jest.Mock).mockReturnValue([
      { frameworkName: 'SOC 2', name: 'SOC 2 Type 1', cycleNumber: 1, phases: [] },
    ]);
    (mockDb.timelineTemplate.findUnique as jest.Mock).mockResolvedValue({ id: 'tml_existing' });
    (mockDb.timelineTemplate.findMany as jest.Mock).mockResolvedValue([]);

    await service.findAll();

    expect(upsertDefaultTemplate).not.toHaveBeenCalled();
  });

  it('normalizes legacy default SOC 2 renewal template name', async () => {
    const service = new TimelinesTemplatesService();

    (mockDb.frameworkEditorFramework.findMany as jest.Mock).mockResolvedValue([
      { id: 'frk_soc2', name: 'SOC 2' },
    ]);
    (getDefaultTemplatesForFramework as jest.Mock).mockReturnValue([
      {
        frameworkName: 'SOC 2',
        name: 'SOC 2 Type 2',
        cycleNumber: 2,
        trackKey: 'soc2_type2',
        templateKey: 'soc2_type2_renewal',
        nextTemplateKey: 'soc2_type2_renewal',
        phases: [],
      },
    ]);
    (mockDb.timelineTemplate.findUnique as jest.Mock).mockResolvedValue({
      id: 'tml_soc2_renewal',
      name: 'SOC 2 Type 2 - Year 2+',
      templateKey: 'soc2_type2_renewal',
      nextTemplateKey: 'soc2_type2_renewal',
    });
    (mockDb.timelineTemplate.findMany as jest.Mock).mockResolvedValue([]);

    await service.findAll();

    expect(mockDb.timelineTemplate.update).toHaveBeenCalledWith({
      where: { id: 'tml_soc2_renewal' },
      data: {
        name: 'SOC 2 Type 2',
        templateKey: 'soc2_type2_renewal',
        nextTemplateKey: 'soc2_type2_renewal',
      },
    });
    expect(upsertDefaultTemplate).not.toHaveBeenCalled();
  });

  it('returns an empty list when no frameworks exist', async () => {
    const service = new TimelinesTemplatesService();

    (mockDb.frameworkEditorFramework.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.timelineTemplate.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.findAll();

    expect(result).toEqual([]);
    expect(mockDb.timelineTemplate.findMany).toHaveBeenCalledWith({
      include: {
        phases: { orderBy: { orderIndex: 'asc' } },
        framework: true,
      },
      orderBy: [{ frameworkId: 'asc' }, { trackKey: 'asc' }, { cycleNumber: 'asc' }],
    });
  });
});
