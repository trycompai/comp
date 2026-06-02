import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsObjectiveService } from './isms-objective.service';

jest.mock('@db', () => ({
  db: {
    ismsDocument: { findFirst: jest.fn() },
    ismsObjective: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockDb = jest.mocked(db);

describe('IsmsObjectiveService', () => {
  let service: IsmsObjectiveService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsObjectiveService();
  });

  describe('create', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto: { objective: 'Maintain ISO 27001', status: 'on_track' as const },
    };

    it('throws NotFoundException when document missing', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.create(args)).rejects.toThrow(NotFoundException);
    });

    it('creates a manual objective with status + next position', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsObjective.findFirst as jest.Mock).mockResolvedValue({
        position: 1,
      });
      (mockDb.ismsObjective.create as jest.Mock).mockResolvedValue({
        id: 'obj_1',
      });

      await service.create(args);

      expect(mockDb.ismsObjective.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: 'manual',
          position: 2,
          status: 'on_track',
        }),
      });
    });

    it('defaults status to not_started', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsObjective.count as jest.Mock).mockResolvedValue(0);
      (mockDb.ismsObjective.create as jest.Mock).mockResolvedValue({});
      await service.create({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: { objective: 'X' },
      });
      const call = (mockDb.ismsObjective.create as jest.Mock).mock.calls[0][0];
      expect(call.data.status).toBe('not_started');
    });
  });

  describe('update', () => {
    const args = {
      objectiveId: 'obj_1',
      organizationId: 'org_1',
      dto: { status: 'met' as const, ownerMemberId: 'mem_1' },
    };

    it('throws NotFoundException when not in org', async () => {
      (mockDb.ismsObjective.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.update(args)).rejects.toThrow(NotFoundException);
    });

    it('flips a derived row to manual on edit', async () => {
      (mockDb.ismsObjective.findFirst as jest.Mock).mockResolvedValue({
        id: 'obj_1',
        source: 'derived',
      });
      (mockDb.ismsObjective.update as jest.Mock).mockResolvedValue({});

      await service.update(args);

      expect(mockDb.ismsObjective.update).toHaveBeenCalledWith({
        where: { id: 'obj_1' },
        data: expect.objectContaining({
          status: 'met',
          ownerMemberId: 'mem_1',
          source: 'manual',
        }),
      });
    });
  });

  describe('remove', () => {
    const args = { objectiveId: 'obj_1', organizationId: 'org_1' };

    it('throws NotFoundException when not in org', async () => {
      (mockDb.ismsObjective.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.remove(args)).rejects.toThrow(NotFoundException);
    });

    it('deletes the objective', async () => {
      (mockDb.ismsObjective.findFirst as jest.Mock).mockResolvedValue({
        id: 'obj_1',
      });
      (mockDb.ismsObjective.delete as jest.Mock).mockResolvedValue({});
      const result = await service.remove(args);
      expect(result).toEqual({ success: true });
    });
  });
});
