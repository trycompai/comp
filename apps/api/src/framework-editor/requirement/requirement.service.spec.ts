jest.mock('@db', () => ({
  db: {
    frameworkEditorRequirement: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    frameworkEditorFramework: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { db } from '@db';
import { RequirementService } from './requirement.service';

const mockDb = db as jest.Mocked<typeof db>;

describe('RequirementService — sortOrder (FRAME-18)', () => {
  let service: RequirementService;

  beforeEach(() => {
    service = new RequirementService();
    jest.clearAllMocks();
    (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
      id: 'frk_1',
    });
    (mockDb.frameworkEditorRequirement.create as jest.Mock).mockResolvedValue({
      id: 'frk_rq_new',
      name: 'New',
    });
    (mockDb.frameworkEditorRequirement.findUnique as jest.Mock).mockResolvedValue({
      id: 'frk_rq_1',
    });
    (mockDb.frameworkEditorRequirement.update as jest.Mock).mockResolvedValue({
      id: 'frk_rq_1',
      name: 'Updated',
    });
    // batchUpdate wraps the per-row update() promises in a transaction.
    (mockDb.$transaction as jest.Mock).mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
  });

  const createDataOf = () =>
    (mockDb.frameworkEditorRequirement.create as jest.Mock).mock.calls[0][0].data;
  const updateDataOf = (i = 0) =>
    (mockDb.frameworkEditorRequirement.update as jest.Mock).mock.calls[i][0].data;

  describe('create', () => {
    it('persists a provided sortOrder', async () => {
      await service.create({
        frameworkId: 'frk_1',
        name: 'R1',
        description: 'd',
        sortOrder: 5,
      } as never);

      expect(createDataOf().sortOrder).toBe(5);
    });

    it('defaults sortOrder to null when omitted', async () => {
      await service.create({
        frameworkId: 'frk_1',
        name: 'R1',
        description: 'd',
      } as never);

      expect(createDataOf().sortOrder).toBeNull();
    });
  });

  describe('update', () => {
    it('persists a provided sortOrder', async () => {
      await service.update('frk_rq_1', { sortOrder: 7 } as never);
      expect(updateDataOf().sortOrder).toBe(7);
    });

    it('clears sortOrder when null is sent', async () => {
      await service.update('frk_rq_1', { sortOrder: null } as never);
      expect(updateDataOf().sortOrder).toBeNull();
    });

    it('leaves sortOrder untouched when not provided', async () => {
      await service.update('frk_rq_1', { name: 'Renamed' } as never);
      expect(updateDataOf().sortOrder).toBeUndefined();
    });
  });

  describe('batchUpdate', () => {
    it('persists sortOrder for rows that include it (including null to clear)', async () => {
      await service.batchUpdate([
        { id: 'a', sortOrder: 3 },
        { id: 'b', sortOrder: null },
        { id: 'c', name: 'NoOrder' },
      ]);

      expect(updateDataOf(0).sortOrder).toBe(3);
      expect(updateDataOf(1).sortOrder).toBeNull();
      // Row without sortOrder must not include the key at all (untouched).
      expect('sortOrder' in updateDataOf(2)).toBe(false);
    });
  });

  describe('findAll / findAllForFramework ordering', () => {
    beforeEach(() => {
      (mockDb.frameworkEditorRequirement.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('orders by sortOrder ascending with nulls last, then name', async () => {
      await service.findAll();
      const orderBy = (mockDb.frameworkEditorRequirement.findMany as jest.Mock).mock
        .calls[0][0].orderBy;
      expect(orderBy).toEqual([
        { sortOrder: { sort: 'asc', nulls: 'last' } },
        { name: 'asc' },
      ]);
    });

    it('orders per-framework requirements the same way', async () => {
      await service.findAllForFramework('frk_1');
      const orderBy = (mockDb.frameworkEditorRequirement.findMany as jest.Mock).mock
        .calls[0][0].orderBy;
      expect(orderBy).toEqual([
        { sortOrder: { sort: 'asc', nulls: 'last' } },
        { name: 'asc' },
      ]);
    });
  });
});
