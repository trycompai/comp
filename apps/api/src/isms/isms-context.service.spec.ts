import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsContextService } from './isms-context.service';
import { collectPlatformData } from './documents/data-source';
import { runDerivation } from './documents/generate';
import {
  diffPlatformSnapshots,
  parsePlatformSnapshot,
} from './documents/snapshot';
import { buildExportSections } from './documents/registry';
import { generateIsmsExportFile } from './utils/export-generator';
import { upsertLatestSnapshotVersion } from './utils/version-snapshot';

jest.mock('@db', () => ({
  db: {
    ismsDocument: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('./documents/data-source', () => ({
  collectPlatformData: jest.fn(),
}));
jest.mock('./documents/generate', () => ({
  runDerivation: jest.fn(),
}));
jest.mock('./documents/snapshot', () => ({
  diffPlatformSnapshots: jest.fn(),
  parsePlatformSnapshot: jest.fn(),
}));
jest.mock('./documents/registry', () => ({
  buildExportSections: jest.fn(),
}));
jest.mock('./utils/export-generator', () => ({
  generateIsmsExportFile: jest.fn(),
}));
jest.mock('./utils/version-snapshot', () => ({
  upsertLatestSnapshotVersion: jest.fn(),
}));

const mockDb = jest.mocked(db);
const mockCollect = jest.mocked(collectPlatformData);
const mockRun = jest.mocked(runDerivation);
const mockDiff = jest.mocked(diffPlatformSnapshots);
const mockParse = jest.mocked(parsePlatformSnapshot);
const mockBuild = jest.mocked(buildExportSections);
const mockExport = jest.mocked(generateIsmsExportFile);

const snapshot = {
  organizationName: 'Acme',
  frameworkNames: ['ISO 27001'],
  vendorCount: 3,
  subProcessorCount: 1,
  vendorsByCategory: { cloud: 3 },
  subProcessorNames: ['Sub Co'],
  infraVendorNames: ['Cloud Co'],
  memberCount: 5,
  membersByDepartment: { it: 5 },
  deviceCount: 4,
  riskCount: 2,
  highRiskCount: 1,
  hasTrainingProgram: true,
  wizardAnswers: {},
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

    it.each([
      'context_of_organization',
      'interested_parties_register',
      'interested_parties_requirements',
      'objectives_plan',
      'isms_scope',
      'leadership_commitment',
    ])('dispatches derivation + snapshot for type %s', async (type) => {
      (mockDb.ismsDocument.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'doc_1', type, frameworkId: 'fw_1' })
        .mockResolvedValueOnce({ id: 'doc_1' });
      mockCollect.mockResolvedValue(snapshot);
      const tx = {};
      (mockDb.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      await service.generate(args);

      expect(mockRun).toHaveBeenCalledWith({
        tx,
        type,
        documentId: 'doc_1',
        organizationId: 'org_1',
        frameworkId: 'fw_1',
        data: snapshot,
      });
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

    it('compares current data against the parsed snapshot by type', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        type: 'objectives_plan',
        frameworkId: 'fw_1',
        versions: [{ sourceSnapshot: snapshot }],
      });
      mockCollect.mockResolvedValue({ ...snapshot, riskCount: 9 });
      mockParse.mockReturnValue(snapshot);
      mockDiff.mockReturnValue({ isStale: true, changedSources: ['risks'] });

      const result = await service.drift(args);

      expect(mockParse).toHaveBeenCalledWith(snapshot);
      expect(mockDiff).toHaveBeenCalledWith({
        type: 'objectives_plan',
        previous: snapshot,
        current: { ...snapshot, riskCount: 9 },
      });
      expect(result).toEqual({ isStale: true, changedSources: ['risks'] });
    });

    it('treats a missing snapshot as no baseline', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        type: 'context_of_organization',
        frameworkId: 'fw_1',
        versions: [],
      });
      mockCollect.mockResolvedValue(snapshot);
      mockParse.mockReturnValue(null);
      mockDiff.mockReturnValue({
        isStale: true,
        changedSources: ['no-baseline'],
      });

      await service.drift(args);

      expect(mockDiff).toHaveBeenCalledWith({
        type: 'context_of_organization',
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

    const buildDocument = (type: string) => ({
      id: 'doc_1',
      type,
      title: 'Doc',
      status: 'approved',
      preparedBy: 'Comp AI',
      approvedAt: null,
      declinedAt: null,
      framework: { name: 'ISO 27001' },
      organization: { name: 'Acme', primaryColor: '#004D3D' },
      approver: { user: { name: 'Jane', email: 'jane@acme.io' } },
      contextIssues: [{ kind: 'external', description: 'd', effect: 'e' }],
      interestedParties: [
        { name: 'Customers', category: 'Customer', needsExpectations: 'n' },
      ],
      interestedPartyRequirements: [
        { partyName: 'Customers', requirement: 'r', treatment: 't' },
      ],
      objectives: [
        {
          objective: 'o',
          target: 't',
          cadence: 'Annual',
          status: 'on_track',
          plan: 'p',
          measurementMethod: 'm',
        },
      ],
      versions: [
        { version: 2, narrative: { statement: 's', commitments: [] } },
      ],
    });

    it.each([
      ['context_of_organization', 'pdf'],
      ['interested_parties_register', 'pdf'],
      ['interested_parties_requirements', 'pdf'],
      ['objectives_plan', 'pdf'],
      ['isms_scope', 'docx'],
      ['leadership_commitment', 'docx'],
    ] as const)(
      'dispatches export sections for %s (%s)',
      async (type, format) => {
        (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(
          buildDocument(type),
        );
        mockBuild.mockReturnValue([{ heading: 'H' }]);
        mockExport.mockResolvedValue({
          fileBuffer: Buffer.from('bytes'),
          mimeType: format === 'pdf' ? 'application/pdf' : 'docx-mime',
          filename: `doc.${format}`,
        });

        const result = await service.exportDocument({
          documentId: 'doc_1',
          organizationId: 'org_1',
          dto: { format },
        });

        expect(mockBuild).toHaveBeenCalledWith(
          expect.objectContaining({ type }),
        );
        expect(mockExport).toHaveBeenCalledWith(
          expect.objectContaining({
            format,
            sections: [{ heading: 'H' }],
            metadata: expect.objectContaining({
              title: 'Doc',
              organizationName: 'Acme',
              primaryColor: '#004D3D',
            }),
          }),
        );
        expect(result.fileBuffer).toBeInstanceOf(Buffer);
      },
    );
  });
});
