import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { IsmsService } from './isms.service';
import { collectPlatformData } from './documents/data-source';
import { upsertLatestSnapshotVersion } from './utils/version-snapshot';

jest.mock('@db', () => ({
  db: {
    ismsDocument: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    member: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('./documents/data-source', () => ({
  collectPlatformData: jest.fn(),
}));
jest.mock('./utils/version-snapshot', () => ({
  upsertLatestSnapshotVersion: jest.fn(),
}));

const mockDb = jest.mocked(db);
const mockCollect = jest.mocked(collectPlatformData);

describe('IsmsService document lifecycle', () => {
  let service: IsmsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsService();
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

    it('includes control links with the linked control id and name', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        controlLinks: [],
      });

      await service.getDocument({ documentId: 'doc_1', organizationId: 'org_1' });

      const callArgs = (mockDb.ismsDocument.findFirst as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.include.controlLinks.select).toEqual({
        id: true,
        controlId: true,
        control: { select: { id: true, name: true } },
      });
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

    it('snapshots data and marks approved', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
      (mockDb.ismsDocument.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'doc_1',
          status: 'needs_review',
          approverId: 'mem_1',
          frameworkId: 'fw_1',
        })
        .mockResolvedValueOnce({ id: 'doc_1', status: 'approved' });
      mockCollect.mockResolvedValue({
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
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      userId: 'usr_1',
    };

    it('throws NotFoundException when member not found', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.decline(args)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when document is not pending approval', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        status: 'approved',
        approverId: 'mem_1',
      });
      await expect(service.decline(args)).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when not the assigned approver', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        status: 'needs_review',
        approverId: 'mem_other',
      });
      await expect(service.decline(args)).rejects.toThrow(ForbiddenException);
    });

    it('sets declined status and declinedAt', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        status: 'needs_review',
        approverId: 'mem_1',
      });
      (mockDb.ismsDocument.update as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        status: 'declined',
      });

      await service.decline(args);

      const call = (mockDb.ismsDocument.update as jest.Mock).mock.calls[0][0];
      expect(call.data.status).toBe('declined');
      expect(call.data.declinedAt).toBeInstanceOf(Date);
    });
  });
});
