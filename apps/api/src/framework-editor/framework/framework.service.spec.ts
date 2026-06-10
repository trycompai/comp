jest.mock('@db', () => {
  const dbMock = {
    frameworkEditorFramework: {
      findUnique: jest.fn(),
    },
    frameworkEditorRequirement: {
      findMany: jest.fn(),
    },
    frameworkEditorControlTemplate: {
      update: jest.fn(),
    },
  };
  return { db: dbMock, Prisma: { PrismaClientKnownRequestError: class {} } };
});

import { BadRequestException, ConflictException } from '@nestjs/common';
import { db } from '@db';
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
