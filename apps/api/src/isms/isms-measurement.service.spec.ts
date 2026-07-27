import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsMeasurementService } from './isms-measurement.service';

jest.mock('@db', () => {
  const db = {
    ismsDocument: { findFirst: jest.fn() },
    ismsMetric: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    ismsMeasurement: {
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(db)),
  };
  return { db };
});

const mockDb = jest.mocked(db);

const activeMetric = {
  id: 'met_1',
  documentId: 'doc_1',
  name: 'Uptime',
  cadence: 'monthly',
  isActive: true,
};

describe('IsmsMeasurementService', () => {
  let service: IsmsMeasurementService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-20T12:00:00Z'));
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
      id: 'doc_1',
    });
    service = new IsmsMeasurementService();
  });

  afterEach(() => jest.useRealTimers());

  describe('create', () => {
    const args = (dto: Record<string, unknown>) => ({
      documentId: 'doc_1',
      organizationId: 'org_1',
      memberId: 'mem_1',
      dto: dto as never,
    });

    it('records the caller as enteredBy and server-sets source', async () => {
      (mockDb.ismsMetric.findFirst as jest.Mock).mockResolvedValue(
        activeMetric,
      );
      (mockDb.ismsMeasurement.create as jest.Mock).mockResolvedValue({});

      await service.create(
        args({
          metricId: 'met_1',
          periodStart: '2026-07-01',
          value: ' 99.95% ',
          note: '',
        }),
      );

      expect(mockDb.ismsMeasurement.create).toHaveBeenCalledWith({
        data: {
          metricId: 'met_1',
          documentId: 'doc_1',
          periodStart: new Date('2026-07-01T00:00:00.000Z'),
          value: '99.95%', // trimmed
          note: null, // blank note normalized
          enteredById: 'mem_1',
          source: 'manual',
        },
      });
    });

    it('accepts a historical (backfill) period — recordedAt stays server-set', async () => {
      (mockDb.ismsMetric.findFirst as jest.Mock).mockResolvedValue(
        activeMetric,
      );
      (mockDb.ismsMeasurement.create as jest.Mock).mockResolvedValue({});

      await service.create(
        args({ metricId: 'met_1', periodStart: '2026-02-01', value: '98%' }),
      );

      const data = (mockDb.ismsMeasurement.create as jest.Mock).mock
        .calls[0][0].data;
      // recordedAt is not client-writable: absent here, the DB default (now())
      // stamps the honest recording date.
      expect(data.recordedAt).toBeUndefined();
    });

    it('rejects a future period', async () => {
      (mockDb.ismsMetric.findFirst as jest.Mock).mockResolvedValue(
        activeMetric,
      );
      await expect(
        service.create(
          args({ metricId: 'met_1', periodStart: '2026-08-01', value: '1' }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a period not aligned to the metric cadence', async () => {
      (mockDb.ismsMetric.findFirst as jest.Mock).mockResolvedValue({
        ...activeMetric,
        cadence: 'quarterly',
      });
      await expect(
        service.create(
          args({ metricId: 'met_1', periodStart: '2026-06-01', value: '1' }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects recording on a metric with no cadence', async () => {
      (mockDb.ismsMetric.findFirst as jest.Mock).mockResolvedValue({
        ...activeMetric,
        cadence: null,
      });
      await expect(
        service.create(
          args({ metricId: 'met_1', periodStart: '2026-07-01', value: '1' }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects recording on a deactivated metric', async () => {
      (mockDb.ismsMetric.findFirst as jest.Mock).mockResolvedValue({
        ...activeMetric,
        isActive: false,
      });
      await expect(
        service.create(
          args({ metricId: 'met_1', periodStart: '2026-07-01', value: '1' }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('stores null enteredBy under API-key auth', async () => {
      (mockDb.ismsMetric.findFirst as jest.Mock).mockResolvedValue(
        activeMetric,
      );
      (mockDb.ismsMeasurement.create as jest.Mock).mockResolvedValue({});

      await service.create({
        documentId: 'doc_1',
        organizationId: 'org_1',
        memberId: null,
        dto: {
          metricId: 'met_1',
          periodStart: '2026-07-01',
          value: '1',
        } as never,
      });

      expect(
        (mockDb.ismsMeasurement.create as jest.Mock).mock.calls[0][0].data
          .enteredById,
      ).toBeNull();
    });
  });

  describe('bulkCreate', () => {
    it('creates all rows in one transaction with the caller as enteredBy', async () => {
      (mockDb.ismsMetric.findMany as jest.Mock).mockResolvedValue([
        activeMetric,
        { ...activeMetric, id: 'met_2', name: 'Vendors', cadence: 'quarterly' },
      ]);
      (mockDb.ismsMeasurement.createMany as jest.Mock).mockResolvedValue({
        count: 3,
      });

      const result = await service.bulkCreate({
        documentId: 'doc_1',
        organizationId: 'org_1',
        memberId: 'mem_1',
        dto: {
          measurements: [
            { metricId: 'met_1', periodStart: '2026-07-01', value: '99.9%' },
            { metricId: 'met_1', periodStart: '2026-06-01', value: '99.8%' },
            {
              metricId: 'met_2',
              periodStart: '2026-04-01',
              value: '100%',
              note: 'Q2',
            },
          ],
        },
      });

      expect(result).toEqual({ count: 3 });
      const { data } = (mockDb.ismsMeasurement.createMany as jest.Mock).mock
        .calls[0][0];
      expect(data).toHaveLength(3);
      expect(data[2]).toMatchObject({
        metricId: 'met_2',
        enteredById: 'mem_1',
        note: 'Q2',
      });
    });

    it('rejects the whole save when any row is invalid (no partial backfill)', async () => {
      (mockDb.ismsMetric.findMany as jest.Mock).mockResolvedValue([
        activeMetric,
      ]);

      await expect(
        service.bulkCreate({
          documentId: 'doc_1',
          organizationId: 'org_1',
          memberId: 'mem_1',
          dto: {
            measurements: [
              { metricId: 'met_1', periodStart: '2026-07-01', value: 'ok' },
              { metricId: 'met_1', periodStart: '2026-08-01', value: 'future' },
            ],
          },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsMeasurement.createMany).not.toHaveBeenCalled();
    });

    it('rejects a metric that is not in the document', async () => {
      (mockDb.ismsMetric.findMany as jest.Mock).mockResolvedValue([]);
      await expect(
        service.bulkCreate({
          documentId: 'doc_1',
          organizationId: 'org_1',
          memberId: 'mem_1',
          dto: {
            measurements: [
              { metricId: 'met_x', periodStart: '2026-07-01', value: '1' },
            ],
          },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update (corrections)', () => {
    it('updates value and note but never recordedAt/enteredById/source', async () => {
      (mockDb.ismsMeasurement.findFirst as jest.Mock).mockResolvedValue({
        id: 'msr_1',
        metricId: 'met_1',
        documentId: 'doc_1',
      });
      (mockDb.ismsMeasurement.update as jest.Mock).mockResolvedValue({});

      await service.update({
        measurementId: 'msr_1',
        organizationId: 'org_1',
        dto: { value: ' 97% ', note: 'corrected' } as never,
      });

      const { data } = (mockDb.ismsMeasurement.update as jest.Mock).mock
        .calls[0][0];
      expect(data).toEqual({
        periodStart: undefined,
        value: '97%',
        note: 'corrected',
      });
      expect(Object.keys(data)).not.toEqual(
        expect.arrayContaining(['recordedAt', 'enteredById', 'source']),
      );
    });

    it('validates a changed period against the metric cadence', async () => {
      (mockDb.ismsMeasurement.findFirst as jest.Mock).mockResolvedValue({
        id: 'msr_1',
        metricId: 'met_1',
        documentId: 'doc_1',
      });
      (mockDb.ismsMetric.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        ...activeMetric,
        cadence: 'quarterly',
      });

      await expect(
        service.update({
          measurementId: 'msr_1',
          organizationId: 'org_1',
          dto: { periodStart: '2026-06-01' } as never,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes a measurement scoped to the organization', async () => {
      (mockDb.ismsMeasurement.findFirst as jest.Mock).mockResolvedValue({
        id: 'msr_1',
        documentId: 'doc_1',
      });
      (mockDb.ismsMeasurement.delete as jest.Mock).mockResolvedValue({});

      const result = await service.remove({
        measurementId: 'msr_1',
        organizationId: 'org_1',
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.ismsMeasurement.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'msr_1',
          metric: { document: { organizationId: 'org_1' } },
        },
      });
    });

    it('throws NotFoundException for a measurement outside the org', async () => {
      (mockDb.ismsMeasurement.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.remove({ measurementId: 'msr_1', organizationId: 'org_1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
