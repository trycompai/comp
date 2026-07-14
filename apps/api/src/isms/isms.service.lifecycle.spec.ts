import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { IsmsService } from './isms.service';
import type { IsmsVersionService } from './isms-version.service';

// approve() (the CS-701 freeze/version flow) is covered in
// isms.service.approve.spec.ts.
jest.mock('@db', () => {
  const db = {
    ismsDocument: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    member: { findFirst: jest.fn(), findMany: jest.fn() },
    ismsRole: { findMany: jest.fn() },
    // lockDocument runs $executeRaw; submitForApproval wraps validate+update in a tx.
    $executeRaw: jest.fn(),
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(db)),
  };
  return { db };
});

const mockDb = jest.mocked(db);

const versionService = {
  createPublishedVersion: jest.fn(),
  publishRenders: jest.fn(),
  getVersions: jest.fn(),
  getVersionExport: jest.fn(),
} as unknown as IsmsVersionService;

describe('IsmsService document lifecycle', () => {
  let service: IsmsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsService(versionService);
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

    it('includes the current version and control links', async () => {
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
      // CS-701: the document carries its live/published version for display.
      expect(callArgs.include.currentVersion).toBeDefined();
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

    it('blocks a Roles doc when a required role is only assigned to a deactivated member', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        type: 'roles_and_responsibilities',
      });
      // Active members exclude 'mem_dead'.
      (mockDb.member.findMany as jest.Mock).mockResolvedValue([
        { id: 'mem_active' },
        { id: 'b' },
        { id: 'c' },
        { id: 'd' },
      ]);
      (mockDb.ismsRole.findMany as jest.Mock).mockResolvedValue([
        {
          roleKey: 'top_management',
          name: 'Top Management',
          auditRoute: null,
          assignments: [{ memberId: 'mem_dead' }], // only a deactivated member
        },
        { roleKey: 'spo', name: 'SPO', auditRoute: null, assignments: [{ memberId: 'b' }] },
        { roleKey: 'deputy_spo', name: 'Deputy SPO', auditRoute: null, assignments: [{ memberId: 'c' }] },
        {
          roleKey: 'internal_auditor',
          name: 'Internal Auditor',
          auditRoute: 'external',
          auditFirmName: 'Acme',
          auditEvidenceRef: 'cert',
          assignments: [{ memberId: 'd' }],
        },
      ]);

      await expect(service.submitForApproval(args)).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsDocument.update).not.toHaveBeenCalled();
    });

    it('allows a Roles doc when every seeded role has an active assignment + route', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        type: 'roles_and_responsibilities',
      });
      (mockDb.member.findMany as jest.Mock).mockResolvedValue([
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
        { id: 'd' },
        { id: 'e' },
      ]);
      (mockDb.ismsRole.findMany as jest.Mock).mockResolvedValue([
        { roleKey: 'top_management', name: 'Top Management', auditRoute: null, assignments: [{ memberId: 'a' }] },
        { roleKey: 'spo', name: 'SPO', auditRoute: null, assignments: [{ memberId: 'b' }] },
        { roleKey: 'deputy_spo', name: 'Deputy SPO', auditRoute: null, assignments: [{ memberId: 'c' }] },
        {
          roleKey: 'internal_auditor',
          name: 'Internal Auditor',
          auditRoute: 'external',
          auditFirmName: 'Acme Audit LLP',
          auditEvidenceRef: 'LA cert on file',
          assignments: [{ memberId: 'd' }],
        },
      ]);
      (mockDb.ismsDocument.update as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        status: 'needs_review',
      });

      await service.submitForApproval(args);
      expect(mockDb.ismsDocument.update).toHaveBeenCalled();
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

    it('sets declined status and declinedAt via an atomic claim', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        status: 'needs_review',
        approverId: 'mem_1',
      });
      (mockDb.ismsDocument.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.decline(args);

      const call = (mockDb.ismsDocument.updateMany as jest.Mock).mock.calls[0][0];
      // Guarded transition: only matches while awaiting this member's review.
      expect(call.where).toEqual({
        id: 'doc_1',
        organizationId: 'org_1',
        status: 'needs_review',
        approverId: 'mem_1',
      });
      expect(call.data.status).toBe('declined');
      expect(call.data.declinedAt).toBeInstanceOf(Date);
    });

    it('aborts when a concurrent approve already won (claim matches 0 rows)', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
        status: 'needs_review',
        approverId: 'mem_1',
      });
      (mockDb.ismsDocument.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(service.decline(args)).rejects.toThrow(BadRequestException);
    });
  });
});
