import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsContextService } from './isms-context.service';
import type { IsmsVersionService } from './isms-version.service';
import { collectPlatformData } from './documents/data-source';
import { runDerivation } from './documents/generate';
import {
  diffPlatformSnapshots,
  parsePlatformSnapshot,
} from './documents/snapshot';
import { updateDraftSnapshot } from './utils/draft-snapshot';
import { renderLiveExport } from './utils/export-payload';

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
jest.mock('./utils/draft-snapshot', () => ({
  updateDraftSnapshot: jest.fn(),
}));
jest.mock('./utils/export-payload', () => ({
  renderLiveExport: jest.fn(),
}));

const mockDb = jest.mocked(db);
const mockCollect = jest.mocked(collectPlatformData);
const mockRun = jest.mocked(runDerivation);
const mockDiff = jest.mocked(diffPlatformSnapshots);
const mockParse = jest.mocked(parsePlatformSnapshot);
const mockUpdateDraft = jest.mocked(updateDraftSnapshot);
const mockRenderLive = jest.mocked(renderLiveExport);

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
  partiesFingerprint: '',
};

const versionService = {
  getVersionExport: jest.fn(),
  getVersions: jest.fn(),
} as unknown as IsmsVersionService;

describe('IsmsContextService', () => {
  let service: IsmsContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsContextService(versionService);
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
    ])(
      'derives + updates the draft snapshot for type %s',
      async (type) => {
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
        // CS-701: the drift baseline is the document's draftSnapshot, not a
        // version row.
        expect(mockUpdateDraft).toHaveBeenCalledWith({
          tx,
          documentId: 'doc_1',
          snapshot,
        });
      },
    );

    it('reuses pre-collected data and skips collectPlatformData', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'doc_1',
          type: 'objectives_plan',
          frameworkId: 'fw_1',
        })
        .mockResolvedValueOnce({ id: 'doc_1' });
      const tx = {};
      (mockDb.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));
      const precollected = { ...snapshot, riskCount: 42 };

      await service.generate({ ...args, data: precollected });

      expect(mockCollect).not.toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalledWith({
        tx,
        type: 'objectives_plan',
        documentId: 'doc_1',
        organizationId: 'org_1',
        frameworkId: 'fw_1',
        data: precollected,
      });
      expect(mockUpdateDraft).toHaveBeenCalledWith({
        tx,
        documentId: 'doc_1',
        snapshot: precollected,
      });
    });
  });

  describe('drift', () => {
    const args = { documentId: 'doc_1', organizationId: 'org_1' };

    it('throws NotFoundException when document missing', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.drift(args)).rejects.toThrow(NotFoundException);
    });

    it('compares current data against the parsed draftSnapshot by type', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        type: 'objectives_plan',
        frameworkId: 'fw_1',
        draftSnapshot: snapshot,
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

    it('treats a missing draftSnapshot as no baseline', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        type: 'context_of_organization',
        frameworkId: 'fw_1',
        draftSnapshot: null,
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
    const result = {
      fileBuffer: Buffer.from('bytes'),
      mimeType: 'application/pdf',
      filename: 'doc.pdf',
    };

    it('renders the live draft when no versionId is given', async () => {
      mockRenderLive.mockResolvedValue(result);

      const out = await service.exportDocument({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: { format: 'pdf' },
      });

      expect(mockRenderLive).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        format: 'pdf',
      });
      expect(versionService.getVersionExport).not.toHaveBeenCalled();
      expect(out).toBe(result);
    });

    it('routes to the version service when a versionId is given', async () => {
      (versionService.getVersionExport as jest.Mock).mockResolvedValue(result);

      const out = await service.exportDocument({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: { format: 'docx', versionId: 'isms_ver_1' },
      });

      expect(versionService.getVersionExport).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        versionId: 'isms_ver_1',
        format: 'docx',
      });
      expect(mockRenderLive).not.toHaveBeenCalled();
      expect(out).toBe(result);
    });
  });
});
