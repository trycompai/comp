import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsAuditControlService } from './isms-audit-control.service';

jest.mock('@db', () => {
  const db = {
    ismsDocument: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ismsAudit: { findFirst: jest.fn() },
    ismsAuditControl: {
      findFirst: jest.fn(),
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

describe('IsmsAuditControlService', () => {
  let service: IsmsAuditControlService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
      status: 'draft',
    });
    service = new IsmsAuditControlService();
  });

  describe('create', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto: { auditId: 'aud_1', controlRef: 'A.8.16 Monitoring activities' },
    };

    it('requires the audit to belong to the org + document (type-scoped)', async () => {
      (mockDb.ismsAudit.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.create(args)).rejects.toThrow(NotFoundException);
      expect(mockDb.ismsAudit.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'aud_1',
          documentId: 'doc_1',
          document: { organizationId: 'org_1', type: 'internal_audit' },
        },
      });
    });

    it('creates a customer row (controlKey null, source manual) after the last position', async () => {
      (mockDb.ismsAudit.findFirst as jest.Mock).mockResolvedValue({
        id: 'aud_1',
        documentId: 'doc_1',
      });
      (mockDb.ismsAuditControl.findFirst as jest.Mock).mockResolvedValue({
        position: 14,
      });
      (mockDb.ismsAuditControl.create as jest.Mock).mockResolvedValue({});

      await service.create(args);

      expect(mockDb.ismsAuditControl.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          auditId: 'aud_1',
          documentId: 'doc_1',
          controlKey: null,
          controlRef: 'A.8.16 Monitoring activities',
          result: null,
          source: 'manual',
          position: 15,
        }),
      });
    });
  });

  describe('update', () => {
    beforeEach(() => {
      (mockDb.ismsAuditControl.findFirst as jest.Mock).mockResolvedValue({
        id: 'ac_1',
        documentId: 'doc_1',
        controlKey: 'clause_4_1_context',
        source: 'derived',
      });
      (mockDb.ismsAuditControl.update as jest.Mock).mockResolvedValue({});
    });

    it('records a result and flips source to manual (seeded rows editable)', async () => {
      await service.update({
        controlId: 'ac_1',
        organizationId: 'org_1',
        dto: { result: 'conformity_confirmed' },
      });

      expect(mockDb.ismsAuditControl.update).toHaveBeenCalledWith({
        where: { id: 'ac_1' },
        data: expect.objectContaining({
          result: 'conformity_confirmed',
          source: 'manual',
        }),
      });
    });

    it('clears a result back to unset with null', async () => {
      await service.update({
        controlId: 'ac_1',
        organizationId: 'org_1',
        dto: { result: null, notes: '' },
      });

      const { data } = (mockDb.ismsAuditControl.update as jest.Mock).mock
        .calls[0][0];
      expect(data.result).toBeNull();
      expect(data.notes).toBeNull();
    });

    it('throws NotFoundException for a row outside the organization', async () => {
      (mockDb.ismsAuditControl.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update({ controlId: 'ac_x', organizationId: 'org_1', dto: {} }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes any row, including seeded ones (removals stick)', async () => {
      (mockDb.ismsAuditControl.findFirst as jest.Mock).mockResolvedValue({
        id: 'ac_1',
        documentId: 'doc_1',
        controlKey: 'clause_4_1_context',
      });
      (mockDb.ismsAuditControl.delete as jest.Mock).mockResolvedValue({});

      const result = await service.remove({
        controlId: 'ac_1',
        organizationId: 'org_1',
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.ismsAuditControl.delete).toHaveBeenCalledWith({
        where: { id: 'ac_1' },
      });
    });
  });
});
