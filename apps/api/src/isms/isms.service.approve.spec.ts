import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { IsmsService } from './isms.service';
import type { IsmsVersionService } from './isms-version.service';
import { collectPlatformData } from './documents/data-source';
import { runDerivation } from './documents/generate';
import { updateDraftSnapshot } from './utils/draft-snapshot';

jest.mock('@db', () => ({
  db: {
    ismsDocument: { findFirst: jest.fn() },
    member: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('./documents/data-source', () => ({
  collectPlatformData: jest.fn(),
}));
jest.mock('./documents/generate', () => ({
  runDerivation: jest.fn(),
}));
jest.mock('./utils/draft-snapshot', () => ({
  updateDraftSnapshot: jest.fn(),
}));

const mockDb = jest.mocked(db);
const mockCollect = jest.mocked(collectPlatformData);
const mockRunDerivation = jest.mocked(runDerivation);
const mockUpdateDraft = jest.mocked(updateDraftSnapshot);

const versionService = {
  createPublishedVersion: jest.fn(),
  publishRenders: jest.fn(),
  getVersions: jest.fn(),
  getVersionExport: jest.fn(),
} as unknown as IsmsVersionService;

const platformData = {
  organizationName: 'Acme',
  frameworkNames: ['ISO 27001'],
  vendorCount: 1,
  subProcessorCount: 0,
  vendorsByCategory: {},
  subProcessorNames: [],
  infraVendorNames: [],
  memberCount: 1,
  membersByDepartment: {},
  deviceCount: 0,
  riskCount: 0,
  highRiskCount: 0,
  hasTrainingProgram: false,
  wizardAnswers: {},
  partiesFingerprint: '',
};

describe('IsmsService.approve (CS-701 versioning)', () => {
  let service: IsmsService;
  const args = {
    documentId: 'doc_1',
    organizationId: 'org_1',
    userId: 'usr_1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsService(versionService);
  });

  it('throws NotFoundException when member not found', async () => {
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.approve(args)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when document is not pending approval', async () => {
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
      id: 'doc_1',
      status: 'draft',
      approverId: 'mem_1',
      frameworkId: 'fw_1',
    });
    await expect(service.approve(args)).rejects.toThrow(BadRequestException);
  });

  it('throws ForbiddenException when no approver is assigned', async () => {
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
      id: 'doc_1',
      status: 'needs_review',
      approverId: null,
      frameworkId: 'fw_1',
    });
    await expect(service.approve(args)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when not the assigned approver', async () => {
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
      id: 'doc_1',
      status: 'needs_review',
      approverId: 'mem_other',
      frameworkId: 'fw_1',
    });
    await expect(service.approve(args)).rejects.toThrow(ForbiddenException);
  });

  it('freezes a published version, promotes it and marks approved', async () => {
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
    const reloaded = { id: 'doc_1', type: 'context_of_organization' };
    (mockDb.ismsDocument.findFirst as jest.Mock)
      .mockResolvedValueOnce({
        id: 'doc_1',
        status: 'needs_review',
        approverId: 'mem_1',
        frameworkId: 'fw_1',
        type: 'context_of_organization',
      })
      .mockResolvedValueOnce({ id: 'doc_1', status: 'approved' });
    mockCollect.mockResolvedValue(platformData);
    const tx = {
      ismsDocument: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(reloaded),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    (mockDb.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));
    (versionService.createPublishedVersion as jest.Mock).mockResolvedValue({
      versionId: 'isms_ver_1',
      version: 1,
      snapshot: {},
    });
    (versionService.publishRenders as jest.Mock).mockResolvedValue(undefined);

    await service.approve(args);

    expect(mockCollect).toHaveBeenCalledWith({
      organizationId: 'org_1',
      frameworkId: 'fw_1',
    });
    // Re-derives in-tx from the same snapshot: persisted rows and the frozen
    // version come from one pass.
    expect(mockRunDerivation).toHaveBeenCalledWith({
      tx,
      type: 'context_of_organization',
      documentId: 'doc_1',
      organizationId: 'org_1',
      frameworkId: 'fw_1',
      data: expect.objectContaining({ organizationName: 'Acme' }),
    });
    // The drift baseline is refreshed on the document (CS-701).
    expect(mockUpdateDraft).toHaveBeenCalledWith(
      expect.objectContaining({ tx, documentId: 'doc_1' }),
    );
    // A published version is created from the reloaded (re-derived) document.
    expect(versionService.createPublishedVersion).toHaveBeenCalledWith(
      expect.objectContaining({ tx, document: reloaded, memberId: 'mem_1' }),
    );
    // The document is promoted to the freshly-created version.
    expect(tx.ismsDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc_1' },
      data: expect.objectContaining({
        status: 'approved',
        declinedAt: null,
        currentVersionId: 'isms_ver_1',
      }),
    });
    // Renders + uploads happen AFTER the transaction (Policies pattern).
    expect(versionService.publishRenders).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        documentId: 'doc_1',
        versionId: 'isms_ver_1',
        version: 1,
      }),
    );
  });
});
