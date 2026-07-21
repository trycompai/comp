import { NotFoundException } from '@nestjs/common';
import { db, Prisma } from '@db';
import { IsmsService } from './isms.service';
import type { IsmsVersionService } from './isms-version.service';

jest.mock('@db', () => ({
  db: {
    frameworkEditorFramework: { findUnique: jest.fn() },
    frameworkEditorIsmsDocumentTemplate: { findMany: jest.fn() },
    ismsDocument: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
    },
    ismsMetric: { findMany: jest.fn() },
    organization: { findUnique: jest.fn() },
    control: { findMany: jest.fn() },
    ismsDocumentControlLink: { createMany: jest.fn() },
  },
  // The programme seed filters on the Prisma JSON-null sentinel.
  Prisma: { AnyNull: Symbol.for('prisma.AnyNull') },
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

      it('reports hasApprovedVersion from a published version OR an approved status', async () => {
        (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
          id: 'fw_1',
          requirements: [],
        });
        (mockDb.ismsDocument.findMany as jest.Mock).mockResolvedValueOnce([
          // Published version exists.
          { id: 'd1', type: 'isms_scope', status: 'draft', requirementId: null, currentVersionId: 'isms_ver_1' },
          // Approved before versioning existed: no version row, but still approved.
          { id: 'd2', type: 'leadership_commitment', status: 'approved', requirementId: null, currentVersionId: null },
          // Never approved.
          { id: 'd3', type: 'objectives_plan', status: 'draft', requirementId: null, currentVersionId: null },
        ]);

        const result = await service.ensureSetup({ ...dto, canWrite: false });

        expect(result.documents.map((d) => d.hasApprovedVersion)).toEqual([
          true,
          true,
          false,
        ]);
      });
    });

    it('seeds the programme on a new Internal Audit doc atomically — only while the narrative is still NULL (CS-724)', async () => {
      (
        mockDb.frameworkEditorFramework.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'fw_1', requirements: [] });
      mockTemplates.mockResolvedValue([]);
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        name: 'Acme Corp',
      });
      (mockDb.ismsDocument.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // existing-types probe
        .mockResolvedValueOnce([{ id: 'doc_ia', type: 'internal_audit' }]) // created lookup
        .mockResolvedValueOnce([]); // final list

      await service.ensureSetup(dto);

      // The NULL filter is the concurrency guard: a narrative written between
      // provisioning and this seed (concurrent setup call or an early customer
      // edit) makes the update match zero rows instead of overwriting.
      expect(mockDb.ismsDocument.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'doc_ia',
          draftNarrative: { equals: Prisma.AnyNull },
        },
        data: {
          draftNarrative: {
            programme: expect.stringContaining(
              'Acme Corp runs an annual internal audit',
            ),
          },
        },
      });
    });

    it('reports overdueMetricCount on the monitoring document row (CS-723)', async () => {
      const { addPeriods, periodStartFor } = jest.requireActual<
        typeof import('./utils/metric-periods')
      >('./utils/metric-periods');
      const current = periodStartFor('monthly', new Date());

      (
        mockDb.frameworkEditorFramework.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'fw_1', requirements: [] });
      (mockDb.ismsDocument.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'doc_mon',
          type: 'monitoring',
          status: 'draft',
          requirementId: null,
          currentVersionId: null,
        },
        {
          id: 'doc_ctx',
          type: 'context_of_organization',
          status: 'draft',
          requirementId: null,
          currentVersionId: null,
        },
      ]);
      (mockDb.ismsMetric.findMany as jest.Mock).mockResolvedValue([
        {
          // Latest measurement three periods back → overdue.
          cadence: 'monthly',
          createdAt: new Date(`${addPeriods('monthly', current, -6)}T00:00:00Z`),
          measurements: [
            {
              periodStart: new Date(
                `${addPeriods('monthly', current, -3)}T00:00:00Z`,
              ),
            },
          ],
        },
        {
          // Previous period recorded → within cadence.
          cadence: 'monthly',
          createdAt: new Date(`${addPeriods('monthly', current, -6)}T00:00:00Z`),
          measurements: [
            {
              periodStart: new Date(
                `${addPeriods('monthly', current, -1)}T00:00:00Z`,
              ),
            },
          ],
        },
      ]);

      const result = await service.ensureSetup({ ...dto, canWrite: false });

      const monitoringRow = result.documents.find(
        (doc) => doc.type === 'monitoring',
      );
      const contextRow = result.documents.find(
        (doc) => doc.type === 'context_of_organization',
      );
      expect(monitoringRow).toMatchObject({ overdueMetricCount: 1 });
      expect(contextRow).not.toHaveProperty('overdueMetricCount');
      expect(mockDb.ismsMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            documentId: 'doc_mon',
            isActive: true,
            cadence: { not: null },
          },
        }),
      );
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

      it('creates docs from templates with templateId set, plus definition fallbacks for untemplated types', async () => {
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
        // 1 template-driven + 8 definition fallbacks: a type shipped before its
        // template seed re-runs (e.g. monitoring, CS-723) still provisions.
        expect(createManyData()).toHaveLength(9);
        expect(createManyData()[0]).toMatchObject({
          type: 'context_of_organization',
          title: 'Context of the Organization',
          templateId: 'tpl_ctx',
          requirementId: 'req_41', // resolved via clause fallback "4.1"
        });
        const monitoring = createManyData().find(
          (doc: { type: string }) => doc.type === 'monitoring',
        );
        expect(monitoring).toMatchObject({ templateId: null });
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

        // objectives (template) + 7 definition fallbacks; the existing
        // context_of_organization is skipped.
        expect(createManyData()).toHaveLength(8);
        expect(createManyData()[0].type).toBe('objectives_plan');
        expect(
          createManyData().map((doc: { type: string }) => doc.type),
        ).not.toContain('context_of_organization');
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
        // Every type already exists, so no create and no control derivation
        // runs; any manual control links the org added are left untouched.
        (mockDb.ismsDocument.findMany as jest.Mock)
          .mockResolvedValueOnce([
            { type: 'context_of_organization' },
            { type: 'interested_parties_register' },
            { type: 'interested_parties_requirements' },
            { type: 'isms_scope' },
            { type: 'leadership_commitment' },
            { type: 'roles_and_responsibilities' },
            { type: 'objectives_plan' },
            { type: 'monitoring' },
            { type: 'internal_audit' },
          ])
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
