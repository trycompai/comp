import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import type { AttachmentsService } from '../attachments/attachments.service';
import { IsmsVersionService } from './isms-version.service';
import type {
  IsmsExportSnapshot,
  LoadedExportDocument,
} from './utils/export-payload';
import { parseExportSnapshot } from './utils/export-payload';

// getVersionExport + publishRenders live in isms-version.service.export.spec.ts.
jest.mock('@db', () => ({
  db: {
    ismsDocument: { findFirst: jest.fn() },
    ismsDocumentVersion: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock('./utils/export-payload', () => ({
  buildExportInput: jest.fn(() => ({ rows: [] })),
  resolveOrgProfile: jest.fn(),
  resolveRolesExtras: jest.fn(),
  resolveMonitoringExtras: jest.fn(),
  parseExportSnapshot: jest.fn(() => null),
}));
jest.mock('./utils/export-metadata', () => ({
  buildExportMetadata: jest.fn(() => ({ version: 0 })),
}));

const mockDb = jest.mocked(db);
const mockParse = jest.mocked(parseExportSnapshot);

function asTx(mock: unknown): Prisma.TransactionClient {
  return mock as Prisma.TransactionClient;
}

const buildDocument = (
  over: Partial<LoadedExportDocument> = {},
): LoadedExportDocument =>
  ({
    id: 'doc_1',
    type: 'context_of_organization',
    title: 'Context Doc',
    preparedBy: 'Comp AI',
    framework: { name: 'ISO 27001' },
    organization: { name: 'Acme', primaryColor: '#004D3D' },
    approver: { user: { name: 'Jane', email: 'jane@acme.io' } },
    draftNarrative: null,
    ...over,
  }) as unknown as LoadedExportDocument;

describe('IsmsVersionService', () => {
  let service: IsmsVersionService;
  const attachments = {
    getObjectBuffer: jest.fn(),
    uploadBuffer: jest.fn(),
  } as unknown as AttachmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsVersionService(attachments);
  });

  describe('createPublishedVersion', () => {
    const buildTx = (lastVersion: number | null) => ({
      ismsDocumentVersion: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            lastVersion == null ? null : { version: lastVersion },
          ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'isms_ver_new' }),
      },
    });
    const now = new Date('2026-07-07T00:00:00.000Z');

    it('computes the next version, demotes prior latest and creates the row', async () => {
      const tx = buildTx(2);

      const result = await service.createPublishedVersion({
        tx: asTx(tx),
        document: buildDocument({ draftNarrative: { statement: 's' } }),
        memberId: 'mem_1',
        now,
        snapshotData: { src: true },
      });

      // next = max(2) + 1
      expect(tx.ismsDocumentVersion.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { version: 'desc' } }),
      );
      // one-latest-per-document invariant: prior latest demoted first
      expect(tx.ismsDocumentVersion.updateMany).toHaveBeenCalledWith({
        where: { documentId: 'doc_1', isLatest: true },
        data: { isLatest: false },
      });
      const createData = tx.ismsDocumentVersion.create.mock.calls[0][0].data;
      expect(createData).toMatchObject({
        documentId: 'doc_1',
        version: 3,
        isLatest: true,
        publishedById: 'mem_1',
        publishedAt: now,
      });
      expect(createData.narrative).toEqual({ statement: 's' });
      expect(createData.contentSnapshot).toBeDefined();
      expect(createData.sourceSnapshot).toEqual({ src: true });
      expect(result).toEqual({
        versionId: 'isms_ver_new',
        version: 3,
        snapshot: expect.objectContaining({ type: 'context_of_organization' }),
      });
    });

    it('starts at version 1 when the document has no prior versions', async () => {
      const tx = buildTx(null);

      const result = await service.createPublishedVersion({
        tx: asTx(tx),
        document: buildDocument(),
        memberId: 'mem_1',
        now,
        snapshotData: {},
      });

      expect(tx.ismsDocumentVersion.create.mock.calls[0][0].data.version).toBe(
        1,
      );
      // Empty draft narrative falls back to {}.
      expect(tx.ismsDocumentVersion.create.mock.calls[0][0].data.narrative).toEqual(
        {},
      );
      expect(result.version).toBe(1);
    });
  });

  describe('getVersions', () => {
    const args = { documentId: 'doc_1', organizationId: 'org_1' };

    it('throws NotFoundException when the document is missing', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.getVersions(args)).rejects.toThrow(NotFoundException);
    });

    it('lists published versions, mapping name, flags and isCurrent', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        currentVersionId: 'isms_ver_2',
      });
      (mockDb.ismsDocumentVersion.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'isms_ver_2',
          version: 2,
          publishedAt: new Date('2026-07-07T00:00:00.000Z'),
          changelog: 'second',
          pdfUrl: 'k.pdf',
          docxUrl: null,
          publishedBy: { user: { name: 'Jane', email: 'jane@acme.io' } },
        },
        {
          id: 'isms_ver_1',
          version: 1,
          publishedAt: new Date('2026-07-06T00:00:00.000Z'),
          changelog: null,
          pdfUrl: null,
          docxUrl: null,
          publishedBy: { user: { name: null, email: 'bob@acme.io' } },
        },
      ]);

      const result = await service.getVersions(args);

      // Only published rows are queried, newest first.
      expect(mockDb.ismsDocumentVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { documentId: 'doc_1', publishedAt: { not: null } },
          orderBy: { version: 'desc' },
        }),
      );
      expect(result.currentVersionId).toBe('isms_ver_2');
      expect(result.versions[0]).toMatchObject({
        id: 'isms_ver_2',
        version: 2,
        publishedByName: 'Jane',
        hasPdf: true,
        hasDocx: false,
        isCurrent: true,
      });
      // Falls back to email when the name is null; not the current version.
      expect(result.versions[1]).toMatchObject({
        publishedByName: 'bob@acme.io',
        hasPdf: false,
        isCurrent: false,
      });
    });

    it('keeps a version downloadable + attributed via the frozen snapshot when files and member are gone', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        currentVersionId: 'isms_ver_1',
      });
      (mockDb.ismsDocumentVersion.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'isms_ver_1',
          version: 1,
          publishedAt: new Date('2026-07-06T00:00:00.000Z'),
          changelog: null,
          pdfUrl: null, // stored files absent (e.g. render/upload failed at publish)
          docxUrl: null,
          contentSnapshot: { type: 'x' },
          publishedBy: null, // approving member later deleted
        },
      ]);
      mockParse.mockReturnValue({
        metadata: { approverName: 'Frozen Approver' },
      } as unknown as IsmsExportSnapshot);

      const result = await service.getVersions(args);

      // Downloadable via snapshot re-render even without stored files, and the
      // approver survives via the frozen snapshot metadata.
      expect(result.versions[0]).toMatchObject({
        publishedByName: 'Frozen Approver',
        hasPdf: true,
        hasDocx: true,
      });
    });
  });
});
