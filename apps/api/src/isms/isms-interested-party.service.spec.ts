import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsInterestedPartyService } from './isms-interested-party.service';

jest.mock('@db', () => ({
  db: {
    ismsDocument: { findFirst: jest.fn() },
    ismsInterestedParty: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockDb = jest.mocked(db);

describe('IsmsInterestedPartyService', () => {
  let service: IsmsInterestedPartyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsInterestedPartyService();
  });

  describe('create', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto: { name: 'Customers', category: 'Customer', needsExpectations: 'n' },
    };

    it('throws NotFoundException when document missing', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.create(args)).rejects.toThrow(NotFoundException);
    });

    it('creates a manual party at the next position', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsInterestedParty.findFirst as jest.Mock).mockResolvedValue({
        position: 3,
      });
      (mockDb.ismsInterestedParty.create as jest.Mock).mockResolvedValue({
        id: 'ip_1',
      });

      await service.create(args);

      expect(mockDb.ismsInterestedParty.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ source: 'manual', position: 4 }),
      });
    });
  });

  describe('update', () => {
    const args = {
      partyId: 'ip_1',
      organizationId: 'org_1',
      dto: { name: 'Updated' },
    };

    it('throws NotFoundException when party not in org', async () => {
      (mockDb.ismsInterestedParty.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(service.update(args)).rejects.toThrow(NotFoundException);
    });

    it('flips a derived row to manual on edit', async () => {
      (mockDb.ismsInterestedParty.findFirst as jest.Mock).mockResolvedValue({
        id: 'ip_1',
        source: 'derived',
      });
      (mockDb.ismsInterestedParty.update as jest.Mock).mockResolvedValue({});

      await service.update(args);

      expect(mockDb.ismsInterestedParty.update).toHaveBeenCalledWith({
        where: { id: 'ip_1' },
        data: expect.objectContaining({ name: 'Updated', source: 'manual' }),
      });
    });

    it('scopes the lookup by organization', async () => {
      (mockDb.ismsInterestedParty.findFirst as jest.Mock).mockResolvedValue({
        id: 'ip_1',
      });
      (mockDb.ismsInterestedParty.update as jest.Mock).mockResolvedValue({});
      await service.update(args);
      expect(mockDb.ismsInterestedParty.findFirst).toHaveBeenCalledWith({
        where: { id: 'ip_1', document: { organizationId: 'org_1' } },
      });
    });
  });

  describe('remove', () => {
    const args = { partyId: 'ip_1', organizationId: 'org_1' };

    it('throws NotFoundException when not in org', async () => {
      (mockDb.ismsInterestedParty.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(service.remove(args)).rejects.toThrow(NotFoundException);
    });

    it('deletes the party', async () => {
      (mockDb.ismsInterestedParty.findFirst as jest.Mock).mockResolvedValue({
        id: 'ip_1',
      });
      (mockDb.ismsInterestedParty.delete as jest.Mock).mockResolvedValue({});
      const result = await service.remove(args);
      expect(mockDb.ismsInterestedParty.delete).toHaveBeenCalledWith({
        where: { id: 'ip_1' },
      });
      expect(result).toEqual({ success: true });
    });
  });
});
