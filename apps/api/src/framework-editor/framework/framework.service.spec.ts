jest.mock('@db', () => {
  const dbMock = {
    frameworkEditorFramework: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    frameworkEditorRequirement: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    frameworkEditorControlTemplate: {
      update: jest.fn(),
    },
    frameworkInstance: {
      deleteMany: jest.fn(),
    },
    timelineTemplate: {
      deleteMany: jest.fn(),
    },
    frameworkVersion: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };
  return { db: dbMock, Prisma: { PrismaClientKnownRequestError: class {} } };
});

import { BadRequestException, ConflictException } from '@nestjs/common';
import { db, Prisma } from '@db';
import { FrameworkEditorFrameworkService } from './framework.service';

const mockDb = db as jest.Mocked<typeof db>;

describe('FrameworkEditorFrameworkService.linkControl', () => {
  let service: FrameworkEditorFrameworkService;

  beforeEach(() => {
    service = new FrameworkEditorFrameworkService();
    jest.clearAllMocks();
    (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
      id: 'frk_1',
      requirements: [],
    });
    (mockDb.frameworkEditorRequirement.findMany as jest.Mock).mockResolvedValue([
      { id: 'req_1' },
      { id: 'req_2' },
      { id: 'req_3' },
    ]);
    (mockDb.frameworkEditorControlTemplate.update as jest.Mock).mockResolvedValue({
      id: 'ct_1',
    });
  });

  it('links only the selected requirements when requirementIds is provided', async () => {
    await service.linkControl('frk_1', 'ct_1', ['req_2']);

    expect(mockDb.frameworkEditorControlTemplate.update).toHaveBeenCalledWith({
      where: { id: 'ct_1' },
      data: { requirements: { connect: [{ id: 'req_2' }] } },
    });
  });

  it('links every framework requirement when requirementIds is omitted (legacy CLI path)', async () => {
    await service.linkControl('frk_1', 'ct_1');

    expect(mockDb.frameworkEditorControlTemplate.update).toHaveBeenCalledWith({
      where: { id: 'ct_1' },
      data: {
        requirements: { connect: [{ id: 'req_1' }, { id: 'req_2' }, { id: 'req_3' }] },
      },
    });
  });

  it('treats a null requirementIds (JSON null past @IsOptional) as link-all, not a crash', async () => {
    await expect(service.linkControl('frk_1', 'ct_1', null)).resolves.toEqual({
      message: 'Control linked to framework',
    });
    expect(mockDb.frameworkEditorControlTemplate.update).toHaveBeenCalledWith({
      where: { id: 'ct_1' },
      data: {
        requirements: { connect: [{ id: 'req_1' }, { id: 'req_2' }, { id: 'req_3' }] },
      },
    });
  });

  it('rejects requirement ids that do not belong to the framework', async () => {
    await expect(
      service.linkControl('frk_1', 'ct_1', ['req_2', 'req_outsider']),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockDb.frameworkEditorControlTemplate.update).not.toHaveBeenCalled();
  });

  it('throws when the framework has no requirements at all', async () => {
    (mockDb.frameworkEditorRequirement.findMany as jest.Mock).mockResolvedValue([]);

    await expect(service.linkControl('frk_1', 'ct_1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(mockDb.frameworkEditorControlTemplate.update).not.toHaveBeenCalled();
  });
});

describe('FrameworkEditorFrameworkService.delete (FRAME-13)', () => {
  let service: FrameworkEditorFrameworkService;

  beforeEach(() => {
    service = new FrameworkEditorFrameworkService();
    jest.clearAllMocks();
    (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
      id: 'frk_1',
    });
  });

  it('deletes instances, timeline templates, versions, requirements, then the framework — in that order', async () => {
    const result = await service.delete('frk_1');

    expect(result).toEqual({ message: 'Framework deleted successfully' });
    expect(mockDb.frameworkInstance.deleteMany).toHaveBeenCalledWith({
      where: { frameworkId: 'frk_1' },
    });
    expect(mockDb.timelineTemplate.deleteMany).toHaveBeenCalledWith({
      where: { frameworkId: 'frk_1' },
    });
    expect(mockDb.frameworkVersion.deleteMany).toHaveBeenCalledWith({
      where: { frameworkId: 'frk_1' },
    });
    expect(mockDb.frameworkEditorRequirement.deleteMany).toHaveBeenCalledWith({
      where: { frameworkId: 'frk_1' },
    });
    expect(mockDb.frameworkEditorFramework.delete).toHaveBeenCalledWith({
      where: { id: 'frk_1' },
    });

    // Order matters: instances must go first (they cascade TimelineInstances,
    // freeing the Restrict FK TimelineInstance.templateId -> TimelineTemplate and
    // FrameworkInstance.currentVersionId -> FrameworkVersion); then timeline
    // templates and versions; requirements before the framework itself.
    const order = [
      (mockDb.frameworkInstance.deleteMany as jest.Mock).mock.invocationCallOrder[0],
      (mockDb.timelineTemplate.deleteMany as jest.Mock).mock.invocationCallOrder[0],
      (mockDb.frameworkVersion.deleteMany as jest.Mock).mock.invocationCallOrder[0],
      (mockDb.frameworkEditorRequirement.deleteMany as jest.Mock).mock
        .invocationCallOrder[0],
      (mockDb.frameworkEditorFramework.delete as jest.Mock).mock.invocationCallOrder[0],
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
    // Timeline templates must be removed AFTER instances (their TimelineInstances
    // cascade-delete with the instance, freeing the templateId Restrict FK).
    expect(
      (mockDb.timelineTemplate.deleteMany as jest.Mock).mock.invocationCallOrder[0],
    ).toBeGreaterThan(
      (mockDb.frameworkInstance.deleteMany as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it('maps a residual FK conflict (P2003) to a ConflictException', async () => {
    // Runtime uses the mocked class (ignores ctor args); the args satisfy the
    // real Prisma type, and Object.assign sets the code the catch checks.
    const fkError = Object.assign(
      new Prisma.PrismaClientKnownRequestError('FK constraint', {
        code: 'P2003',
        clientVersion: '0',
      }),
      { code: 'P2003' },
    );
    (mockDb.$transaction as jest.Mock).mockRejectedValueOnce(fkError);

    await expect(service.delete('frk_1')).rejects.toBeInstanceOf(ConflictException);
  });
});
