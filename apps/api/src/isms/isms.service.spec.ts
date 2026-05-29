import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsService } from './isms.service';
import { collectContextData } from './utils/context-data-source';
import { upsertLatestSnapshotVersion } from './utils/version-snapshot';

jest.mock('@db', () => ({
  db: {
    frameworkEditorFramework: { findUnique: jest.fn() },
    ismsDocument: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    member: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('./utils/context-data-source', () => ({
  collectContextData: jest.fn(),
}));
jest.mock('./utils/version-snapshot', () => ({
  upsertLatestSnapshotVersion: jest.fn(),
}));

const mockDb = jest.mocked(db);
const mockCollect = jest.mocked(collectContextData);

describe('IsmsService', () => {
  let service: IsmsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsService();
  });

  describe('ensureSetup', () => {
    const dto = { organizationId: 'org_1', frameworkId: 'fw_1' };

    it('throws NotFoundException when framework not found', async () => {
      (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(service.ensureSetup(dto)).rejects.toThrow(NotFoundException);
    });

    it('creates only missing document types and maps requirements', async () => {
      (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue(
        {
          id: 'fw_1',
          requirements: [
            { id: 'req_41', name: '4.1 Context', identifier: '4.1' },
          ],
        },
      );
      // One existing type so only the other five are created.
      (mockDb.ismsDocument.findMany as jest.Mock)
        .mockResolvedValueOnce([{ type: 'context_of_organization' }])
        .mockResolvedValueOnce([
          {
            id: 'doc_1',
            type: 'context_of_organization',
            status: 'draft',
            requirementId: 'req_41',
          },
        ]);
      (mockDb.ismsDocument.create as jest.Mock).mockResolvedValue({});

      const result = await service.ensureSetup(dto);

      expect(mockDb.ismsDocument.create).toHaveBeenCalledTimes(5);
      expect(result.success).toBe(true);
      expect(result.documents[0]).toEqual({
        id: 'doc_1',
        type: 'context_of_organization',
        status: 'draft',
        requirementId: 'req_41',
        hasApprovedVersion: false,
      });
    });

    it('leaves requirementId null when no clause matches', async () => {
      (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue(
        { id: 'fw_1', requirements: [] },
      );
      (mockDb.ismsDocument.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (mockDb.ismsDocument.create as jest.Mock).mockResolvedValue({});

      await service.ensureSetup(dto);

      expect(mockDb.ismsDocument.create).toHaveBeenCalledTimes(6);
      const firstCall = (mockDb.ismsDocument.create as jest.Mock).mock
        .calls[0][0];
      expect(firstCall.data.requirementId).toBeNull();
    });
  });

  describe('getDocument', () => {
    it('throws NotFoundException when not found / wrong org', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.getDocument({ documentId: 'doc_1', organizationId: 'org_1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns the document scoped by org', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      const result = await service.getDocument({
        documentId: 'doc_1',
        organizationId: 'org_1',
      });
      expect(result).toEqual({ id: 'doc_1' });
      expect(mockDb.ismsDocument.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc_1', organizationId: 'org_1' },
        }),
      );
    });
  });

  describe('submitForApproval', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto: { approverId: 'mem_1' },
    };

    it('throws NotFoundException when approver not in org', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.submitForApproval(args)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sets approver and needs_review status', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsDocument.update as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        status: 'needs_review',
      });

      await service.submitForApproval(args);

      expect(mockDb.ismsDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc_1' },
        data: expect.objectContaining({
          approverId: 'mem_1',
          status: 'needs_review',
          approvedAt: null,
          declinedAt: null,
        }),
      });
    });
  });

  describe('approve', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      userId: 'usr_1',
    };

    it('throws NotFoundException when member not found', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.approve(args)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when not the assigned approver', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        approverId: 'mem_other',
        frameworkId: 'fw_1',
      });
      await expect(service.approve(args)).rejects.toThrow(ForbiddenException);
    });

    it('snapshots data and marks approved', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
      (mockDb.ismsDocument.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'doc_1',
          approverId: 'mem_1',
          frameworkId: 'fw_1',
        })
        .mockResolvedValueOnce({ id: 'doc_1', status: 'approved' });
      mockCollect.mockResolvedValue({
        frameworkNames: ['ISO 27001'],
        vendorCount: 1,
        subProcessorCount: 0,
        vendorsByCategory: {},
        memberCount: 1,
        membersByDepartment: {},
        deviceCount: 0,
      });
      const tx = {
        ismsDocument: { update: jest.fn().mockResolvedValue({}) },
      };
      (mockDb.$transaction as jest.Mock).mockImplementation((cb) => cb(tx));

      await service.approve(args);

      expect(mockCollect).toHaveBeenCalledWith({
        organizationId: 'org_1',
        frameworkId: 'fw_1',
      });
      expect(upsertLatestSnapshotVersion).toHaveBeenCalled();
      expect(tx.ismsDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc_1' },
        data: expect.objectContaining({
          status: 'approved',
          declinedAt: null,
        }),
      });
    });
  });

  describe('decline', () => {
    it('throws NotFoundException when document not found', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.decline({ documentId: 'doc_1', organizationId: 'org_1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('sets declined status and declinedAt', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsDocument.update as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        status: 'declined',
      });

      await service.decline({ documentId: 'doc_1', organizationId: 'org_1' });

      const call = (mockDb.ismsDocument.update as jest.Mock).mock.calls[0][0];
      expect(call.data.status).toBe('declined');
      expect(call.data.declinedAt).toBeInstanceOf(Date);
    });
  });
});
