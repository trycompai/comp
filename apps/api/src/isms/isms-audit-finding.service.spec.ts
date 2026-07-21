import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsAuditFindingService } from './isms-audit-finding.service';

jest.mock('@db', () => {
  const db = {
    ismsDocument: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ismsAudit: { findFirst: jest.fn() },
    ismsAuditControl: { findFirst: jest.fn() },
    member: { findFirst: jest.fn() },
    ismsAuditFinding: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(db)),
  };
  return { db };
});

const mockDb = jest.mocked(db);

describe('IsmsAuditFindingService', () => {
  let service: IsmsAuditFindingService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
      status: 'draft',
    });
    (mockDb.ismsAuditFinding.findMany as jest.Mock).mockResolvedValue([]);
    service = new IsmsAuditFindingService();
  });

  describe('create', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto: {
        auditId: 'aud_1',
        type: 'nc_minor' as const,
        description: 'Three of ten access reviews had no approval evidence.',
      },
    };

    beforeEach(() => {
      (mockDb.ismsAudit.findFirst as jest.Mock).mockResolvedValue({
        id: 'aud_1',
        documentId: 'doc_1',
      });
      (mockDb.ismsAuditFinding.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.ismsAuditFinding.create as jest.Mock).mockResolvedValue({});
    });

    it('creates a standalone finding with a generated F-01 reference and open status', async () => {
      await service.create(args);

      expect(mockDb.ismsAuditFinding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          auditId: 'aud_1',
          documentId: 'doc_1',
          reference: 'F-01',
          type: 'nc_minor',
          controlId: null,
          status: 'open',
          position: 0,
        }),
      });
    });

    it('continues the per-audit sequence past deleted references', async () => {
      (mockDb.ismsAuditFinding.findMany as jest.Mock).mockResolvedValue([
        { reference: 'F-01' },
        { reference: 'F-03' },
      ]);

      await service.create(args);

      expect(mockDb.ismsAuditFinding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ reference: 'F-04' }),
      });
    });

    it('rejects a related control from another audit', async () => {
      (mockDb.ismsAuditControl.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({
          ...args,
          dto: { ...args.dto, controlId: 'ac_other' },
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.ismsAuditControl.findFirst).toHaveBeenCalledWith({
        where: { id: 'ac_other', auditId: 'aud_1' },
      });
      expect(mockDb.ismsAuditFinding.create).not.toHaveBeenCalled();
    });

    it('rejects an owner that is not an active org member', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({
          ...args,
          dto: { ...args.dto, ownerMemberId: 'mem_x' },
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.member.findFirst).toHaveBeenCalledWith({
        where: { id: 'mem_x', organizationId: 'org_1', deactivated: false },
      });
    });
  });

  describe('update', () => {
    beforeEach(() => {
      (mockDb.ismsAuditFinding.findFirst as jest.Mock).mockResolvedValue({
        id: 'af_1',
        auditId: 'aud_1',
        documentId: 'doc_1',
      });
      (mockDb.ismsAuditFinding.update as jest.Mock).mockResolvedValue({});
    });

    it('closes a finding with closure evidence and a cleared due date', async () => {
      await service.update({
        findingId: 'af_1',
        organizationId: 'org_1',
        dto: {
          status: 'closed',
          closureEvidence: 'Restore test evidenced in task ev_123.',
          dueDate: null,
        },
      });

      const { data } = (mockDb.ismsAuditFinding.update as jest.Mock).mock
        .calls[0][0];
      expect(data.status).toBe('closed');
      expect(data.closureEvidence).toBe('Restore test evidenced in task ev_123.');
      expect(data.dueDate).toBeNull();
      // The server-generated reference is never updatable.
      expect(data.reference).toBeUndefined();
    });

    it('unlinks the related control with null', async () => {
      await service.update({
        findingId: 'af_1',
        organizationId: 'org_1',
        dto: { controlId: null },
      });

      const { data } = (mockDb.ismsAuditFinding.update as jest.Mock).mock
        .calls[0][0];
      expect(data.controlId).toBeNull();
      expect(mockDb.ismsAuditControl.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the finding', async () => {
      (mockDb.ismsAuditFinding.findFirst as jest.Mock).mockResolvedValue({
        id: 'af_1',
        documentId: 'doc_1',
      });
      (mockDb.ismsAuditFinding.delete as jest.Mock).mockResolvedValue({});

      const result = await service.remove({
        findingId: 'af_1',
        organizationId: 'org_1',
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.ismsAuditFinding.delete).toHaveBeenCalledWith({
        where: { id: 'af_1' },
      });
    });
  });
});
