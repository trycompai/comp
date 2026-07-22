import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsReviewActionService } from './isms-review-action.service';

jest.mock('@db', () => {
  const db = {
    ismsDocument: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ismsManagementReview: {
      findFirst: jest.fn(),
    },
    ismsReviewAction: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(db)),
  };
  return { db };
});

const mockDb = jest.mocked(db);

const UNSIGNED_REVIEW = {
  id: 'mr_1',
  documentId: 'doc_1',
  reference: 'MR-2026-01',
  signoffChairName: null,
  signoffChairDate: null,
};
const SIGNED_REVIEW = {
  ...UNSIGNED_REVIEW,
  signoffChairName: 'Raoul Plickat',
  signoffChairDate: new Date('2026-05-01T00:00:00.000Z'),
};

describe('IsmsReviewActionService', () => {
  let service: IsmsReviewActionService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
      status: 'draft',
    });
    (mockDb.ismsReviewAction.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.ismsReviewAction.findFirst as jest.Mock).mockResolvedValue(null);
    service = new IsmsReviewActionService();
  });

  describe('create', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto: { reviewId: 'mr_1', description: 'Backfill overdue metrics.' },
    };

    it('creates an action with a generated per-review reference', async () => {
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        UNSIGNED_REVIEW,
      );
      (mockDb.ismsReviewAction.create as jest.Mock).mockResolvedValue({
        id: 'mra_1',
      });

      await service.create(args);

      expect(mockDb.ismsReviewAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reviewId: 'mr_1',
          documentId: 'doc_1',
          reference: 'A01',
          description: 'Backfill overdue metrics.',
          status: 'open',
          position: 0,
        }),
      });
    });

    it('continues the sequence from the highest surviving reference', async () => {
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        UNSIGNED_REVIEW,
      );
      (mockDb.ismsReviewAction.findMany as jest.Mock).mockResolvedValue([
        { reference: 'A01' },
        { reference: 'A04' },
      ]);
      (mockDb.ismsReviewAction.findFirst as jest.Mock).mockResolvedValue({
        position: 3,
      });
      (mockDb.ismsReviewAction.create as jest.Mock).mockResolvedValue({
        id: 'mra_5',
      });

      await service.create(args);

      expect(mockDb.ismsReviewAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ reference: 'A05', position: 4 }),
      });
    });

    it('rejects new actions on a signed review (the arising set is frozen)', async () => {
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        SIGNED_REVIEW,
      );
      await expect(service.create(args)).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsReviewAction.create).not.toHaveBeenCalled();
    });

    it('requires the owner to be an active member of the organization', async () => {
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        UNSIGNED_REVIEW,
      );
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({
          ...args,
          dto: { ...args.dto, ownerMemberId: 'mem_gone' },
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.ismsReviewAction.create).not.toHaveBeenCalled();
    });
  });

  describe('update / remove', () => {
    it('still updates an action on a SIGNED review — actions track to closure', async () => {
      (mockDb.ismsReviewAction.findFirst as jest.Mock).mockResolvedValue({
        id: 'mra_1',
        documentId: 'doc_1',
        review: SIGNED_REVIEW,
      });
      (mockDb.ismsReviewAction.update as jest.Mock).mockResolvedValue({});

      await service.update({
        actionId: 'mra_1',
        organizationId: 'org_1',
        dto: { status: 'closed' },
      });

      const { data } = (mockDb.ismsReviewAction.update as jest.Mock).mock
        .calls[0][0];
      expect(data.status).toBe('closed');
      expect(data.description).toBeUndefined();
    });

    it('refuses to delete an action from a signed review', async () => {
      (mockDb.ismsReviewAction.findFirst as jest.Mock).mockResolvedValue({
        id: 'mra_1',
        documentId: 'doc_1',
        review: SIGNED_REVIEW,
      });

      await expect(
        service.remove({ actionId: 'mra_1', organizationId: 'org_1' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsReviewAction.delete).not.toHaveBeenCalled();
    });

    it('deletes an action from an unsigned review', async () => {
      (mockDb.ismsReviewAction.findFirst as jest.Mock).mockResolvedValue({
        id: 'mra_1',
        documentId: 'doc_1',
        review: UNSIGNED_REVIEW,
      });
      (mockDb.ismsReviewAction.delete as jest.Mock).mockResolvedValue({});

      const result = await service.remove({
        actionId: 'mra_1',
        organizationId: 'org_1',
      });
      expect(result).toEqual({ success: true });
    });
  });
});
