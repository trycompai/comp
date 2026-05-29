import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsContextService } from './isms-context.service';
import { collectContextData } from './utils/context-data-source';
import {
  deriveContextIssues,
  diffSnapshots,
} from './utils/context-derivation';
import { generateIsmsExportFile } from './utils/export-generator';
import { upsertLatestSnapshotVersion } from './utils/version-snapshot';

jest.mock('@db', () => ({
  db: {
    ismsDocument: { findFirst: jest.fn() },
    ismsContextIssue: {
      deleteMany: jest.fn(),
      count: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock('./utils/context-data-source', () => ({
  collectContextData: jest.fn(),
}));
jest.mock('./utils/context-derivation', () => ({
  deriveContextIssues: jest.fn(),
  diffSnapshots: jest.fn(),
}));
jest.mock('./utils/export-generator', () => ({
  generateIsmsExportFile: jest.fn(),
}));
jest.mock('./utils/version-snapshot', () => ({
  upsertLatestSnapshotVersion: jest.fn(),
}));

const mockDb = jest.mocked(db);
const mockCollect = jest.mocked(collectContextData);
const mockDerive = jest.mocked(deriveContextIssues);
const mockDiff = jest.mocked(diffSnapshots);
const mockExport = jest.mocked(generateIsmsExportFile);

const snapshot = {
  frameworkNames: ['ISO 27001'],
  vendorCount: 3,
  subProcessorCount: 1,
  vendorsByCategory: { cloud: 3 },
  memberCount: 5,
  membersByDepartment: { it: 5 },
  deviceCount: 4,
};

describe('IsmsContextService', () => {
  let service: IsmsContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsContextService();
  });

  describe('generate', () => {
    const args = { documentId: 'doc_1', organizationId: 'org_1' };

    it('throws NotFoundException when document missing', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.generate(args)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for unsupported type', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        type: 'isms_scope',
        frameworkId: 'fw_1',
      });
      await expect(service.generate(args)).rejects.toThrow(BadRequestException);
    });

    it('replaces derived rows, preserves manual rows, and snapshots', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'doc_1',
          type: 'context_of_organization',
          frameworkId: 'fw_1',
        })
        .mockResolvedValueOnce({ id: 'doc_1', contextIssues: [] });
      mockCollect.mockResolvedValue(snapshot);
      mockDerive.mockReturnValue([
        {
          kind: 'external',
          description: 'd1',
          effect: 'e1',
          source: 'derived',
          derivedFrom: 'framework:ISO 27001',
          position: 0,
        },
        {
          kind: 'internal',
          description: 'd2',
          effect: 'e2',
          source: 'derived',
          derivedFrom: 'members',
          position: 1,
        },
      ]);
      const tx = {
        ismsContextIssue: {
          deleteMany: jest.fn().mockResolvedValue({}),
          count: jest.fn().mockResolvedValue(2), // two manual rows preserved
          createMany: jest.fn().mockResolvedValue({}),
        },
      };
      (mockDb.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      await service.generate(args);

      expect(tx.ismsContextIssue.deleteMany).toHaveBeenCalledWith({
        where: { documentId: 'doc_1', source: 'derived' },
      });
      expect(tx.ismsContextIssue.count).toHaveBeenCalledWith({
        where: { documentId: 'doc_1', source: 'manual' },
      });
      // Derived rows appended AFTER the 2 preserved manual rows.
      const created = tx.ismsContextIssue.createMany.mock.calls[0][0].data;
      expect(created).toHaveLength(2);
      expect(created[0].position).toBe(2);
      expect(created[1].position).toBe(3);
      expect(upsertLatestSnapshotVersion).toHaveBeenCalledWith({
        tx,
        documentId: 'doc_1',
        snapshot,
      });
    });
  });

  describe('drift', () => {
    const args = { documentId: 'doc_1', organizationId: 'org_1' };

    it('throws NotFoundException when document missing', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.drift(args)).rejects.toThrow(NotFoundException);
    });

    it('compares current data against the stored snapshot', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        frameworkId: 'fw_1',
        versions: [{ sourceSnapshot: snapshot }],
      });
      mockCollect.mockResolvedValue({ ...snapshot, vendorCount: 9 });
      mockDiff.mockReturnValue({ isStale: true, changedSources: ['vendors'] });

      const result = await service.drift(args);

      expect(mockDiff).toHaveBeenCalledWith({
        previous: snapshot,
        current: { ...snapshot, vendorCount: 9 },
      });
      expect(result).toEqual({ isStale: true, changedSources: ['vendors'] });
    });

    it('treats a missing snapshot as no baseline', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        frameworkId: 'fw_1',
        versions: [],
      });
      mockCollect.mockResolvedValue(snapshot);
      mockDiff.mockReturnValue({
        isStale: true,
        changedSources: ['no-baseline'],
      });

      await service.drift(args);

      expect(mockDiff).toHaveBeenCalledWith({
        previous: null,
        current: snapshot,
      });
    });
  });

  describe('exportDocument', () => {
    it('throws NotFoundException when document missing', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.exportDocument({
          documentId: 'doc_1',
          organizationId: 'org_1',
          dto: { format: 'pdf' },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    const buildDocument = () => ({
      id: 'doc_1',
      title: 'Context of the Organization',
      status: 'approved',
      preparedBy: 'Comp AI',
      approvedAt: null,
      declinedAt: null,
      framework: { name: 'ISO 27001' },
      organization: { name: 'Acme', primaryColor: '#004D3D' },
      approver: { user: { name: 'Jane', email: 'jane@acme.io' } },
      contextIssues: [
        { kind: 'external', description: 'd', effect: 'e' },
      ],
      versions: [{ version: 2 }],
    });

    it('returns a pdf buffer', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(
        buildDocument(),
      );
      mockExport.mockResolvedValue({
        fileBuffer: Buffer.from('pdf'),
        mimeType: 'application/pdf',
        filename: 'context.pdf',
      });

      const result = await service.exportDocument({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: { format: 'pdf' },
      });

      expect(mockExport).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'pdf',
          issues: [{ kind: 'external', description: 'd', effect: 'e' }],
          metadata: expect.objectContaining({
            title: 'Context of the Organization',
            frameworkName: 'ISO 27001',
            version: 2,
            organizationName: 'Acme',
            primaryColor: '#004D3D',
            approverName: 'Jane',
          }),
        }),
      );
      expect(result.mimeType).toBe('application/pdf');
    });

    it('returns a docx buffer', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(
        buildDocument(),
      );
      mockExport.mockResolvedValue({
        fileBuffer: Buffer.from('docx'),
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename: 'context.docx',
      });

      const result = await service.exportDocument({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: { format: 'docx' },
      });

      expect(mockExport).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'docx' }),
      );
      expect(result.fileBuffer).toBeInstanceOf(Buffer);
      expect(result.filename).toBe('context.docx');
    });
  });
});
