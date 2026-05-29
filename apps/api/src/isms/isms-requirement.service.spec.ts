import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsRequirementService } from './isms-requirement.service';

jest.mock('@db', () => ({
  db: {
    ismsDocument: { findFirst: jest.fn() },
    ismsInterestedPartyRequirement: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockDb = jest.mocked(db);

describe('IsmsRequirementService', () => {
  let service: IsmsRequirementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsRequirementService();
  });

  describe('create', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto: { partyName: 'Customers', requirement: 'r', treatment: 't' },
    };

    it('throws NotFoundException when document missing', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.create(args)).rejects.toThrow(NotFoundException);
    });

    it('creates a manual requirement at the next position', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (
        mockDb.ismsInterestedPartyRequirement.count as jest.Mock
      ).mockResolvedValue(1);
      (
        mockDb.ismsInterestedPartyRequirement.create as jest.Mock
      ).mockResolvedValue({ id: 'ipr_1' });

      await service.create(args);

      expect(mockDb.ismsInterestedPartyRequirement.create).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            source: 'manual',
            position: 1,
            interestedPartyId: null,
          }),
        },
      );
    });
  });

  describe('update', () => {
    const args = {
      requirementId: 'ipr_1',
      organizationId: 'org_1',
      dto: { treatment: 'updated' },
    };

    it('throws NotFoundException when not in org', async () => {
      (
        mockDb.ismsInterestedPartyRequirement.findFirst as jest.Mock
      ).mockResolvedValue(null);
      await expect(service.update(args)).rejects.toThrow(NotFoundException);
    });

    it('flips a derived row to manual on edit', async () => {
      (
        mockDb.ismsInterestedPartyRequirement.findFirst as jest.Mock
      ).mockResolvedValue({ id: 'ipr_1', source: 'derived' });
      (
        mockDb.ismsInterestedPartyRequirement.update as jest.Mock
      ).mockResolvedValue({});

      await service.update(args);

      expect(mockDb.ismsInterestedPartyRequirement.update).toHaveBeenCalledWith(
        {
          where: { id: 'ipr_1' },
          data: expect.objectContaining({
            treatment: 'updated',
            source: 'manual',
          }),
        },
      );
    });
  });

  describe('remove', () => {
    const args = { requirementId: 'ipr_1', organizationId: 'org_1' };

    it('throws NotFoundException when not in org', async () => {
      (
        mockDb.ismsInterestedPartyRequirement.findFirst as jest.Mock
      ).mockResolvedValue(null);
      await expect(service.remove(args)).rejects.toThrow(NotFoundException);
    });

    it('deletes the requirement', async () => {
      (
        mockDb.ismsInterestedPartyRequirement.findFirst as jest.Mock
      ).mockResolvedValue({ id: 'ipr_1' });
      (
        mockDb.ismsInterestedPartyRequirement.delete as jest.Mock
      ).mockResolvedValue({});
      const result = await service.remove(args);
      expect(result).toEqual({ success: true });
    });
  });
});
