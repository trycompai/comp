import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsAuditService } from './isms-audit.service';
import {
  DEFAULT_AUDIT_CRITERIA,
  DEFAULT_AUDIT_SCOPE,
} from './documents/internal-audit-defaults';

jest.mock('@db', () => {
  const db = {
    ismsDocument: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ismsAudit: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ismsAuditControl: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(db)),
  };
  return { db };
});

const mockDb = jest.mocked(db);
const currentYear = new Date().getUTCFullYear();

describe('IsmsAuditService', () => {
  let service: IsmsAuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
      status: 'draft',
    });
    (mockDb.ismsAudit.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.ismsAuditControl.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.ismsAuditControl.createMany as jest.Mock).mockResolvedValue({
      count: 15,
    });
    service = new IsmsAuditService();
  });

  describe('create', () => {
    const args = { documentId: 'doc_1', organizationId: 'org_1', dto: {} };

    it('throws NotFoundException when the internal-audit document is missing', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.create(args)).rejects.toThrow(NotFoundException);
      expect(mockDb.ismsDocument.findFirst).toHaveBeenCalledWith({
        where: { id: 'doc_1', organizationId: 'org_1', type: 'internal_audit' },
      });
    });

    it('creates an audit with template defaults and a generated reference', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsAudit.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.ismsAudit.create as jest.Mock).mockResolvedValue({
        id: 'aud_1',
      });

      await service.create(args);

      expect(mockDb.ismsAudit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentId: 'doc_1',
          reference: `IA-${currentYear}-01`,
          scope: DEFAULT_AUDIT_SCOPE,
          criteria: DEFAULT_AUDIT_CRITERIA,
          auditorName: null,
          position: 0,
        }),
      });
    });

    it('seeds the fifteen default Controls Tested rows in the same transaction', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsAudit.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.ismsAudit.create as jest.Mock).mockResolvedValue({
        id: 'aud_1',
      });

      await service.create(args);

      const { data } = (mockDb.ismsAuditControl.createMany as jest.Mock).mock
        .calls[0][0];
      expect(data).toHaveLength(15);
      expect(data[0]).toMatchObject({ auditId: 'aud_1', documentId: 'doc_1' });
    });

    it('continues the per-year sequence from the highest existing reference', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsAudit.findMany as jest.Mock).mockResolvedValue([
        { reference: `IA-${currentYear}-01` },
        { reference: `IA-${currentYear}-04` },
      ]);
      (mockDb.ismsAudit.findFirst as jest.Mock).mockResolvedValue({
        position: 3,
      });
      (mockDb.ismsAudit.create as jest.Mock).mockResolvedValue({
        id: 'aud_2',
      });

      await service.create(args);

      expect(mockDb.ismsAudit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reference: `IA-${currentYear}-05`,
          position: 4,
        }),
      });
    });

    it('rejects an invalid planned date before opening the transaction', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      await expect(
        service.create({
          ...args,
          dto: { plannedStartDate: '2026-02-30' },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsAudit.create).not.toHaveBeenCalled();
    });

    it('rejects a planned end date before the start date', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      await expect(
        service.create({
          ...args,
          dto: { plannedStartDate: '2026-05-20', plannedEndDate: '2026-05-15' },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsAudit.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    beforeEach(() => {
      (mockDb.ismsAudit.findFirst as jest.Mock).mockResolvedValue({
        id: 'aud_1',
        documentId: 'doc_1',
        plannedStartDate: null,
        plannedEndDate: null,
      });
      (mockDb.ismsAudit.update as jest.Mock).mockResolvedValue({});
    });

    it('rejects an end date before the STORED start date (merged schedule)', async () => {
      (mockDb.ismsAudit.findFirst as jest.Mock).mockResolvedValue({
        id: 'aud_1',
        documentId: 'doc_1',
        plannedStartDate: new Date('2026-05-15T00:00:00.000Z'),
        plannedEndDate: null,
      });

      await expect(
        service.update({
          auditId: 'aud_1',
          organizationId: 'org_1',
          dto: { plannedEndDate: '2026-05-10' },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsAudit.update).not.toHaveBeenCalled();
    });

    it('allows fixing an inverted schedule by moving both dates together', async () => {
      (mockDb.ismsAudit.findFirst as jest.Mock).mockResolvedValue({
        id: 'aud_1',
        documentId: 'doc_1',
        plannedStartDate: new Date('2026-05-15T00:00:00.000Z'),
        plannedEndDate: null,
      });

      await service.update({
        auditId: 'aud_1',
        organizationId: 'org_1',
        dto: { plannedStartDate: '2026-06-01', plannedEndDate: '2026-06-05' },
      });
      expect(mockDb.ismsAudit.update).toHaveBeenCalled();
    });

    it('updates status and conclusion, leaving omitted fields untouched', async () => {
      await service.update({
        auditId: 'aud_1',
        organizationId: 'org_1',
        dto: { status: 'complete', conclusionVerdict: 'conform' },
      });

      const { data } = (mockDb.ismsAudit.update as jest.Mock).mock.calls[0][0];
      expect(data.status).toBe('complete');
      expect(data.conclusionVerdict).toBe('conform');
      expect(data.scope).toBeUndefined();
      expect(data.signoffAuditorName).toBeUndefined();
    });

    it('saves sign-off slots and clears them with null/empty', async () => {
      await service.update({
        auditId: 'aud_1',
        organizationId: 'org_1',
        dto: {
          signoffAuditorName: 'Sarah Chen',
          signoffAuditorDate: '2026-05-20',
          signoffSpoName: null,
          signoffSpoDate: '',
        },
      });

      const { data } = (mockDb.ismsAudit.update as jest.Mock).mock.calls[0][0];
      expect(data.signoffAuditorName).toBe('Sarah Chen');
      expect(data.signoffAuditorDate).toEqual(
        new Date('2026-05-20T00:00:00.000Z'),
      );
      expect(data.signoffSpoName).toBeNull();
      expect(data.signoffSpoDate).toBeNull();
    });

    it('throws NotFoundException for an audit outside the organization', async () => {
      (mockDb.ismsAudit.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update({ auditId: 'aud_x', organizationId: 'org_1', dto: {} }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.ismsAudit.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'aud_x',
          document: { organizationId: 'org_1', type: 'internal_audit' },
        },
      });
    });
  });

  describe('remove', () => {
    it('deletes the audit (cascading to controls and findings)', async () => {
      (mockDb.ismsAudit.findFirst as jest.Mock).mockResolvedValue({
        id: 'aud_1',
        documentId: 'doc_1',
      });
      (mockDb.ismsAudit.delete as jest.Mock).mockResolvedValue({});

      const result = await service.remove({
        auditId: 'aud_1',
        organizationId: 'org_1',
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.ismsAudit.delete).toHaveBeenCalledWith({
        where: { id: 'aud_1' },
      });
    });
  });
});
