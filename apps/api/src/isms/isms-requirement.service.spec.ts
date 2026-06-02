import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsRequirementService } from './isms-requirement.service';

jest.mock('@db', () => {
  const db = {
    ismsDocument: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    ismsInterestedParty: { findFirst: jest.fn() },
    ismsInterestedPartyRequirement: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // Run the callback with the same mock as the transaction client.
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(db)),
  };
  return { db };
});

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
        mockDb.ismsInterestedPartyRequirement.findFirst as jest.Mock
      ).mockResolvedValue({ position: 0 });
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

    it('rejects a party that does not belong to the document', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsInterestedParty.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({
          documentId: 'doc_1',
          organizationId: 'org_1',
          dto: {
            partyName: 'Customers',
            requirement: 'r',
            treatment: 't',
            interestedPartyId: 'ip_other',
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('links a party that belongs to the document', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsInterestedParty.findFirst as jest.Mock).mockResolvedValue({
        id: 'ip_1',
      });
      (
        mockDb.ismsInterestedPartyRequirement.findFirst as jest.Mock
      ).mockResolvedValue({ position: 0 });
      (
        mockDb.ismsInterestedPartyRequirement.create as jest.Mock
      ).mockResolvedValue({ id: 'ipr_1' });

      await service.create({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: {
          partyName: 'Customers',
          requirement: 'r',
          treatment: 't',
          interestedPartyId: 'ip_1',
        },
      });

      expect(mockDb.ismsInterestedParty.findFirst).toHaveBeenCalledWith({
        where: { id: 'ip_1', documentId: 'doc_1' },
        select: { id: true },
      });
      expect(
        mockDb.ismsInterestedPartyRequirement.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({ interestedPartyId: 'ip_1' }),
      });
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

    it('rejects relinking to a party from another document', async () => {
      (
        mockDb.ismsInterestedPartyRequirement.findFirst as jest.Mock
      ).mockResolvedValue({ id: 'ipr_1', documentId: 'doc_1' });
      (mockDb.ismsInterestedParty.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update({
          requirementId: 'ipr_1',
          organizationId: 'org_1',
          dto: { interestedPartyId: 'ip_other' },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsInterestedParty.findFirst).toHaveBeenCalledWith({
        where: { id: 'ip_other', documentId: 'doc_1' },
        select: { id: true },
      });
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

  it('reverts an approved document to draft so it needs re-approval', async () => {
    (
      mockDb.ismsInterestedPartyRequirement.findFirst as jest.Mock
    ).mockResolvedValue({ id: 'ipr_1', documentId: 'doc_1' });
    (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
      status: 'approved',
    });
    (
      mockDb.ismsInterestedPartyRequirement.update as jest.Mock
    ).mockResolvedValue({});

    await service.update({
      requirementId: 'ipr_1',
      organizationId: 'org_1',
      dto: { treatment: 'updated' },
    });

    expect(mockDb.ismsDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc_1' },
      data: { status: 'draft', approvedAt: null, approverId: null },
    });
  });
});
