import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsService } from './isms.service';

jest.mock('@db', () => ({
  db: {
    frameworkEditorFramework: { findUnique: jest.fn() },
    frameworkEditorIsmsDocumentTemplate: { findMany: jest.fn() },
    ismsDocument: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    control: { findMany: jest.fn() },
    ismsDocumentControlLink: { createMany: jest.fn() },
  },
}));
jest.mock('./documents/data-source', () => ({
  collectPlatformData: jest.fn(),
}));
jest.mock('./utils/version-snapshot', () => ({
  upsertLatestSnapshotVersion: jest.fn(),
}));

const mockDb = jest.mocked(db);

describe('IsmsService ensureSetup', () => {
  let service: IsmsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsService();
    (mockDb.control.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.ismsDocumentControlLink.createMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
  });

  describe('ensureSetup', () => {
    const dto = { organizationId: 'org_1', frameworkId: 'fw_1' };

    const mockTemplates = (
      mockDb.frameworkEditorIsmsDocumentTemplate.findMany as jest.Mock
    );

    it('throws NotFoundException when framework not found', async () => {
      (
        mockDb.frameworkEditorFramework.findUnique as jest.Mock
      ).mockResolvedValue(null);
      await expect(service.ensureSetup(dto)).rejects.toThrow(NotFoundException);
    });

    describe('template-driven (templates seeded)', () => {
      beforeEach(() => {
        (
          mockDb.frameworkEditorFramework.findUnique as jest.Mock
        ).mockResolvedValue({
          id: 'fw_1',
          requirements: [
            { id: 'req_41', name: '4.1 Context', identifier: '4.1' },
            { id: 'req_62', name: '6.2 Objectives', identifier: '6.2' },
          ],
        });
      });

      it('creates docs from templates with templateId set', async () => {
        mockTemplates.mockResolvedValue([
          {
            id: 'tpl_ctx',
            documentType: 'context_of_organization',
            name: 'Context of the Organization',
            clause: '4.1',
            requirementLinks: [],
            controlLinks: [],
          },
        ]);
        (mockDb.ismsDocument.findMany as jest.Mock)
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);
        (mockDb.ismsDocument.create as jest.Mock).mockResolvedValue({});

        await service.ensureSetup(dto);

        expect(mockDb.ismsDocument.create).toHaveBeenCalledTimes(1);
        const createArgs = (mockDb.ismsDocument.create as jest.Mock).mock
          .calls[0][0];
        expect(createArgs.data).toMatchObject({
          type: 'context_of_organization',
          title: 'Context of the Organization',
          templateId: 'tpl_ctx',
          requirementId: 'req_41', // resolved via clause fallback "4.1"
        });
      });

      it('prefers an explicit framework requirement link over clause match', async () => {
        mockTemplates.mockResolvedValue([
          {
            id: 'tpl_ctx',
            documentType: 'context_of_organization',
            name: 'Context of the Organization',
            clause: '4.1',
            requirementLinks: [
              { frameworkId: 'fw_1', requirementId: 'req_custom' },
            ],
            controlLinks: [],
          },
        ]);
        (mockDb.ismsDocument.findMany as jest.Mock)
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);
        (mockDb.ismsDocument.create as jest.Mock).mockResolvedValue({});

        await service.ensureSetup(dto);

        const createArgs = (mockDb.ismsDocument.create as jest.Mock).mock
          .calls[0][0];
        expect(createArgs.data.requirementId).toBe('req_custom');
        expect(createArgs.data.templateId).toBe('tpl_ctx');
      });

      it('falls back to clause match when no link exists for the framework', async () => {
        mockTemplates.mockResolvedValue([
          {
            id: 'tpl_obj',
            documentType: 'objectives_plan',
            name: 'Objectives and Plan',
            clause: '6.2',
            requirementLinks: [],
            controlLinks: [],
          },
        ]);
        (mockDb.ismsDocument.findMany as jest.Mock)
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);
        (mockDb.ismsDocument.create as jest.Mock).mockResolvedValue({});

        await service.ensureSetup(dto);

        const createArgs = (mockDb.ismsDocument.create as jest.Mock).mock
          .calls[0][0];
        expect(createArgs.data.requirementId).toBe('req_62');
      });

      it('skips templates whose document type already exists', async () => {
        mockTemplates.mockResolvedValue([
          {
            id: 'tpl_ctx',
            documentType: 'context_of_organization',
            name: 'Context of the Organization',
            clause: '4.1',
            requirementLinks: [],
            controlLinks: [],
          },
          {
            id: 'tpl_obj',
            documentType: 'objectives_plan',
            name: 'Objectives and Plan',
            clause: '6.2',
            requirementLinks: [],
            controlLinks: [],
          },
        ]);
        (mockDb.ismsDocument.findMany as jest.Mock)
          .mockResolvedValueOnce([{ type: 'context_of_organization' }])
          .mockResolvedValueOnce([]);
        (mockDb.ismsDocument.create as jest.Mock).mockResolvedValue({});

        await service.ensureSetup(dto);

        expect(mockDb.ismsDocument.create).toHaveBeenCalledTimes(1);
        const createArgs = (mockDb.ismsDocument.create as jest.Mock).mock
          .calls[0][0];
        expect(createArgs.data.type).toBe('objectives_plan');
      });

      it('auto-derives org control links from the template control links', async () => {
        mockTemplates.mockResolvedValue([
          {
            id: 'tpl_ctx',
            documentType: 'context_of_organization',
            name: 'Context of the Organization',
            clause: '4.1',
            requirementLinks: [],
            controlLinks: [
              { controlTemplateId: 'ct_1' },
              { controlTemplateId: 'ct_2' },
            ],
          },
        ]);
        (mockDb.ismsDocument.findMany as jest.Mock)
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);
        (mockDb.ismsDocument.create as jest.Mock).mockResolvedValue({
          id: 'doc_new',
        });
        (mockDb.control.findMany as jest.Mock).mockResolvedValue([
          { id: 'ctl_1' },
          { id: 'ctl_2' },
        ]);

        await service.ensureSetup(dto);

        expect(mockDb.control.findMany).toHaveBeenCalledWith({
          where: {
            organizationId: 'org_1',
            controlTemplateId: { in: ['ct_1', 'ct_2'] },
          },
          select: { id: true },
        });
        expect(mockDb.ismsDocumentControlLink.createMany).toHaveBeenCalledWith({
          data: [
            { ismsDocumentId: 'doc_new', controlId: 'ctl_1' },
            { ismsDocumentId: 'doc_new', controlId: 'ctl_2' },
          ],
          skipDuplicates: true,
        });
      });

      it('skips control derivation when the template has no control links', async () => {
        mockTemplates.mockResolvedValue([
          {
            id: 'tpl_ctx',
            documentType: 'context_of_organization',
            name: 'Context of the Organization',
            clause: '4.1',
            requirementLinks: [],
            controlLinks: [],
          },
        ]);
        (mockDb.ismsDocument.findMany as jest.Mock)
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);
        (mockDb.ismsDocument.create as jest.Mock).mockResolvedValue({
          id: 'doc_new',
        });

        await service.ensureSetup(dto);

        expect(mockDb.control.findMany).not.toHaveBeenCalled();
        expect(
          mockDb.ismsDocumentControlLink.createMany,
        ).not.toHaveBeenCalled();
      });

      it('preserves existing links on re-run by skipping created types', async () => {
        mockTemplates.mockResolvedValue([
          {
            id: 'tpl_ctx',
            documentType: 'context_of_organization',
            name: 'Context of the Organization',
            clause: '4.1',
            requirementLinks: [],
            controlLinks: [{ controlTemplateId: 'ct_1' }],
          },
        ]);
        // Document already exists, so no create and no control derivation runs;
        // any manual control links the org added are left untouched.
        (mockDb.ismsDocument.findMany as jest.Mock)
          .mockResolvedValueOnce([{ type: 'context_of_organization' }])
          .mockResolvedValueOnce([]);

        await service.ensureSetup(dto);

        expect(mockDb.ismsDocument.create).not.toHaveBeenCalled();
        expect(mockDb.control.findMany).not.toHaveBeenCalled();
        expect(
          mockDb.ismsDocumentControlLink.createMany,
        ).not.toHaveBeenCalled();
      });
    });

  });
});
