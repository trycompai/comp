jest.mock('@db', () => {
  const dbMock = {
    frameworkEditorIsmsDocumentTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    frameworkEditorIsmsDocumentRequirementLink: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    frameworkEditorFramework: {
      findUnique: jest.fn(),
    },
    frameworkEditorRequirement: {
      findUnique: jest.fn(),
    },
  };

  return { db: dbMock };
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsDocumentTemplateService } from './isms-document-template.service';

const mockDb = db as jest.Mocked<typeof db>;

describe('IsmsDocumentTemplateService', () => {
  let service: IsmsDocumentTemplateService;

  beforeEach(() => {
    service = new IsmsDocumentTemplateService();
    jest.clearAllMocks();
    (
      mockDb.frameworkEditorIsmsDocumentTemplate.findUnique as jest.Mock
    ).mockResolvedValue({ id: 'tpl_ctx' });
    (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
      id: 'fw_1',
    });
    (
      mockDb.frameworkEditorRequirement.findUnique as jest.Mock
    ).mockResolvedValue({ frameworkId: 'fw_1' });
    (
      mockDb.frameworkEditorIsmsDocumentRequirementLink.createMany as jest.Mock
    ).mockResolvedValue({ count: 1 });
    (
      mockDb.frameworkEditorIsmsDocumentRequirementLink.deleteMany as jest.Mock
    ).mockResolvedValue({ count: 1 });
  });

  describe('findAll', () => {
    it('orders by sortOrder and includes all requirement links when no framework filter', async () => {
      (
        mockDb.frameworkEditorIsmsDocumentTemplate.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'tpl_ctx', requirementLinks: [] }]);

      const result = await service.findAll();

      expect(result).toEqual([{ id: 'tpl_ctx', requirementLinks: [] }]);
      const callArgs = (
        mockDb.frameworkEditorIsmsDocumentTemplate.findMany as jest.Mock
      ).mock.calls[0][0];
      expect(callArgs.orderBy).toEqual({ sortOrder: 'asc' });
      expect(callArgs.include.requirementLinks.where).toBeUndefined();
    });

    it('scopes requirement links to the given framework', async () => {
      (
        mockDb.frameworkEditorIsmsDocumentTemplate.findMany as jest.Mock
      ).mockResolvedValue([]);

      await service.findAll('fw_1');

      const callArgs = (
        mockDb.frameworkEditorIsmsDocumentTemplate.findMany as jest.Mock
      ).mock.calls[0][0];
      expect(callArgs.include.requirementLinks.where).toEqual({
        frameworkId: 'fw_1',
      });
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the template does not exist', async () => {
      (
        mockDb.frameworkEditorIsmsDocumentTemplate.findUnique as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        service.update('tpl_missing', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('persists only the provided fields', async () => {
      (
        mockDb.frameworkEditorIsmsDocumentTemplate.update as jest.Mock
      ).mockResolvedValue({ id: 'tpl_ctx', name: 'New name' });

      await service.update('tpl_ctx', { name: 'New name', sortOrder: 3 });

      const updateArgs = (
        mockDb.frameworkEditorIsmsDocumentTemplate.update as jest.Mock
      ).mock.calls[0][0];
      expect(updateArgs).toEqual({
        where: { id: 'tpl_ctx' },
        data: { name: 'New name', sortOrder: 3 },
      });
    });
  });

  describe('linkRequirement', () => {
    it('requires a frameworkId', async () => {
      await expect(
        service.linkRequirement({
          templateId: 'tpl_ctx',
          requirementId: 'req_41',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the framework is missing', async () => {
      (
        mockDb.frameworkEditorFramework.findUnique as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        service.linkRequirement({
          templateId: 'tpl_ctx',
          requirementId: 'req_41',
          frameworkId: 'fw_missing',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a requirement from another framework', async () => {
      (
        mockDb.frameworkEditorRequirement.findUnique as jest.Mock
      ).mockResolvedValue({ frameworkId: 'fw_other' });

      await expect(
        service.linkRequirement({
          templateId: 'tpl_ctx',
          requirementId: 'req_41',
          frameworkId: 'fw_1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates the framework-scoped link idempotently', async () => {
      await service.linkRequirement({
        templateId: 'tpl_ctx',
        requirementId: 'req_41',
        frameworkId: 'fw_1',
      });

      expect(
        mockDb.frameworkEditorIsmsDocumentRequirementLink.createMany,
      ).toHaveBeenCalledWith({
        data: [
          {
            frameworkId: 'fw_1',
            ismsDocumentTemplateId: 'tpl_ctx',
            requirementId: 'req_41',
          },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe('unlinkRequirement', () => {
    it('deletes the framework-scoped link', async () => {
      await service.unlinkRequirement({
        templateId: 'tpl_ctx',
        requirementId: 'req_41',
        frameworkId: 'fw_1',
      });

      expect(
        mockDb.frameworkEditorIsmsDocumentRequirementLink.deleteMany,
      ).toHaveBeenCalledWith({
        where: {
          frameworkId: 'fw_1',
          ismsDocumentTemplateId: 'tpl_ctx',
          requirementId: 'req_41',
        },
      });
    });
  });
});
