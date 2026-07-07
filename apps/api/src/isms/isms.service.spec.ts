import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsService } from './isms.service';
import type { IsmsVersionService } from './isms-version.service';

jest.mock('@db', () => ({
  db: {
    frameworkEditorFramework: { findUnique: jest.fn() },
    frameworkEditorIsmsDocumentTemplate: { findMany: jest.fn() },
    ismsDocument: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    control: { findMany: jest.fn() },
    ismsDocumentControlLink: { createMany: jest.fn() },
  },
}));
jest.mock('./documents/data-source', () => ({
  collectPlatformData: jest.fn(),
}));
jest.mock('./documents/generate', () => ({
  runDerivation: jest.fn(),
}));

const mockDb = jest.mocked(db);

// ensureSetup never touches the version service; a bare stub satisfies the ctor.
const versionService = {} as unknown as IsmsVersionService;

/** Convenience accessor for the first createMany call's `data` array. */
const createManyData = () =>
  (mockDb.ismsDocument.createMany as jest.Mock).mock.calls[0][0].data;

describe('IsmsService ensureSetup', () => {
  let service: IsmsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsService(versionService);
    (mockDb.control.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.ismsDocument.createMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
    (mockDb.ismsDocumentControlLink.createMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
  });

  describe('ensureSetup', () => {
    const dto = { organizationId: 'org_1', frameworkId: 'fw_1', canWrite: true };

    const mockTemplates = mockDb.frameworkEditorIsmsDocumentTemplate
      .findMany as jest.Mock;

    it('throws NotFoundException when framework not found', async () => {
      (
        mockDb.frameworkEditorFramework.findUnique as jest.Mock
      ).mockResolvedValue(null);
      await expect(service.ensureSetup(dto)).rejects.toThrow(NotFoundException);
    });

    describe('read-only callers (canWrite: false)', () => {
      it('never writes — only lists the existing documents', async () => {
        (
          mockDb.frameworkEditorFramework.findUnique as jest.Mock
        ).mockResolvedValue({
          id: 'fw_1',
          requirements: [],
        });
        (mockDb.ismsDocument.findMany as jest.Mock).mockResolvedValueOnce([
          {
            id: 'doc_1',
            type: 'context_of_organization',
            status: 'draft',
            requirementId: null,
          },
        ]);

        const result = await service.ensureSetup({ ...dto, canWrite: false });

        // No provisioning at all: no template resolution, no creates.
        expect(mockTemplates).not.toHaveBeenCalled();
        expect(mockDb.ismsDocument.createMany).not.toHaveBeenCalled();
        expect(mockDb.control.findMany).not.toHaveBeenCalled();
        expect(
          mockDb.ismsDocumentControlLink.createMany,
        ).not.toHaveBeenCalled();
        // The findMany that ran was the list query, not a provisioning probe.
        expect(mockDb.ismsDocument.findMany).toHaveBeenCalledTimes(1);
        expect(result.documents).toHaveLength(1);
      });
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
          .mockResolvedValueOnce([]) // existing-types probe
          .mockResolvedValueOnce([]) // created lookup
          .mockResolvedValueOnce([]); // final list

        await service.ensureSetup(dto);

        expect(mockDb.ismsDocument.createMany).toHaveBeenCalledTimes(1);
        expect(createManyData()).toHaveLength(1);
        expect(createManyData()[0]).toMatchObject({
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
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);

        await service.ensureSetup(dto);

        expect(createManyData()[0].requirementId).toBe('req_custom');
        expect(createManyData()[0].templateId).toBe('tpl_ctx');
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
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);

        await service.ensureSetup(dto);

        expect(createManyData()[0].requirementId).toBe('req_62');
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
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);

        await service.ensureSetup(dto);

        expect(createManyData()).toHaveLength(1);
        expect(createManyData()[0].type).toBe('objectives_plan');
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
          .mockResolvedValueOnce([]) // existing-types probe
          .mockResolvedValueOnce([
            { id: 'doc_new', type: 'context_of_organization' },
          ]) // created lookup
          .mockResolvedValueOnce([]); // final list
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
          .mockResolvedValueOnce([
            { id: 'doc_new', type: 'context_of_organization' },
          ])
          .mockResolvedValueOnce([]);

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

        expect(mockDb.ismsDocument.createMany).not.toHaveBeenCalled();
        expect(mockDb.control.findMany).not.toHaveBeenCalled();
        expect(
          mockDb.ismsDocumentControlLink.createMany,
        ).not.toHaveBeenCalled();
      });
    });
  });
});
