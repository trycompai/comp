import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsMetricService } from './isms-metric.service';

jest.mock('@db', () => {
  const db = {
    ismsDocument: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    member: { findFirst: jest.fn() },
    ismsObjective: { findFirst: jest.fn() },
    ismsMetric: {
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

describe('IsmsMetricService', () => {
  let service: IsmsMetricService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
      status: 'draft',
    });
    service = new IsmsMetricService();
  });

  describe('create', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto: { name: 'Custom metric', cadence: 'monthly' as const },
    };

    it('throws NotFoundException when the monitoring document is missing', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.create(args)).rejects.toThrow(NotFoundException);
      expect(mockDb.ismsDocument.findFirst).toHaveBeenCalledWith({
        where: { id: 'doc_1', organizationId: 'org_1', type: 'monitoring' },
      });
    });

    it('creates a custom (manual, metricKey null, active) metric', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsMetric.findFirst as jest.Mock).mockResolvedValue({
        position: 8,
      });
      (mockDb.ismsMetric.create as jest.Mock).mockResolvedValue({
        id: 'met_1',
      });

      await service.create(args);

      expect(mockDb.ismsMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metricKey: null,
          source: 'manual',
          isActive: true,
          cadence: 'monthly',
          position: 9,
        }),
      });
    });

    it('rejects a monitor member that is not an active org member', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({
          ...args,
          dto: { ...args.dto, monitorMemberId: 'mem_x' },
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.member.findFirst).toHaveBeenCalledWith({
        where: { id: 'mem_x', organizationId: 'org_1', deactivated: false },
      });
    });

    it('rejects an objective link outside the organization', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsObjective.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({
          ...args,
          dto: { ...args.dto, objectiveId: 'obj_other_org' },
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.ismsObjective.findFirst).toHaveBeenCalledWith({
        where: { id: 'obj_other_org', document: { organizationId: 'org_1' } },
      });
    });
  });

  describe('update', () => {
    it('flips source to manual and supports deactivation', async () => {
      (mockDb.ismsMetric.findFirst as jest.Mock).mockResolvedValue({
        id: 'met_1',
        documentId: 'doc_1',
        source: 'derived',
      });
      (mockDb.ismsMetric.update as jest.Mock).mockResolvedValue({});

      await service.update({
        metricId: 'met_1',
        organizationId: 'org_1',
        dto: { isActive: false },
      });

      expect(mockDb.ismsMetric.update).toHaveBeenCalledWith({
        where: { id: 'met_1' },
        data: expect.objectContaining({ isActive: false, source: 'manual' }),
      });
    });

    it('supports clearing people back to the SPO default with null', async () => {
      (mockDb.ismsMetric.findFirst as jest.Mock).mockResolvedValue({
        id: 'met_1',
        documentId: 'doc_1',
      });
      (mockDb.ismsMetric.update as jest.Mock).mockResolvedValue({});

      await service.update({
        metricId: 'met_1',
        organizationId: 'org_1',
        dto: { monitorMemberId: null },
      });

      expect(mockDb.member.findFirst).not.toHaveBeenCalled();
      expect(mockDb.ismsMetric.update).toHaveBeenCalledWith({
        where: { id: 'met_1' },
        data: expect.objectContaining({ monitorMemberId: null }),
      });
    });
  });

  describe('remove', () => {
    it('blocks hard-deleting a seeded metric (deactivate instead)', async () => {
      (mockDb.ismsMetric.findFirst as jest.Mock).mockResolvedValue({
        id: 'met_1',
        documentId: 'doc_1',
        metricKey: 'uptime',
      });

      await expect(
        service.remove({ metricId: 'met_1', organizationId: 'org_1' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsMetric.delete).not.toHaveBeenCalled();
    });

    it('deletes a custom metric', async () => {
      (mockDb.ismsMetric.findFirst as jest.Mock).mockResolvedValue({
        id: 'met_1',
        documentId: 'doc_1',
        metricKey: null,
      });
      (mockDb.ismsMetric.delete as jest.Mock).mockResolvedValue({});

      const result = await service.remove({
        metricId: 'met_1',
        organizationId: 'org_1',
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.ismsMetric.delete).toHaveBeenCalledWith({
        where: { id: 'met_1' },
      });
    });
  });
});
