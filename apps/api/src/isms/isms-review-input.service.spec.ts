import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsReviewInputService } from './isms-review-input.service';

jest.mock('@db', () => {
  const db = {
    ismsDocument: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ismsManagementReview: {
      findFirst: jest.fn(),
    },
    ismsReviewInput: {
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

describe('IsmsReviewInputService', () => {
  let service: IsmsReviewInputService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
      status: 'draft',
    });
    service = new IsmsReviewInputService();
  });

  describe('create', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto: { reviewId: 'mr_1', inputRef: '(h) Custom input' },
    };

    it('creates a manual row on an unsigned review, appending its position', async () => {
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        UNSIGNED_REVIEW,
      );
      (mockDb.ismsReviewInput.findFirst as jest.Mock).mockResolvedValue({
        position: 9,
      });
      (mockDb.ismsReviewInput.create as jest.Mock).mockResolvedValue({
        id: 'mri_11',
      });

      await service.create(args);

      expect(mockDb.ismsReviewInput.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reviewId: 'mr_1',
          documentId: 'doc_1',
          inputRef: '(h) Custom input',
          discussed: false,
          source: 'manual',
          position: 10,
        }),
      });
    });

    it('rejects new rows on a signed review (locked minutes)', async () => {
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        SIGNED_REVIEW,
      );
      await expect(service.create(args)).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsReviewInput.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the review is not on this document/org', async () => {
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(service.create(args)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update / remove', () => {
    it('updates notes and the discussed tick on an unsigned review', async () => {
      (mockDb.ismsReviewInput.findFirst as jest.Mock).mockResolvedValue({
        id: 'mri_1',
        documentId: 'doc_1',
        review: UNSIGNED_REVIEW,
      });
      (mockDb.ismsReviewInput.update as jest.Mock).mockResolvedValue({});

      await service.update({
        inputId: 'mri_1',
        organizationId: 'org_1',
        dto: { discussionNotes: 'Covered in full.', discussed: true },
      });

      const { data } = (mockDb.ismsReviewInput.update as jest.Mock).mock
        .calls[0][0];
      expect(data.discussionNotes).toBe('Covered in full.');
      expect(data.discussed).toBe(true);
      expect(data.inputRef).toBeUndefined();
    });

    it('rejects edits and deletes on a signed review', async () => {
      (mockDb.ismsReviewInput.findFirst as jest.Mock).mockResolvedValue({
        id: 'mri_1',
        documentId: 'doc_1',
        review: SIGNED_REVIEW,
      });

      await expect(
        service.update({
          inputId: 'mri_1',
          organizationId: 'org_1',
          dto: { discussed: true },
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.remove({ inputId: 'mri_1', organizationId: 'org_1' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsReviewInput.update).not.toHaveBeenCalled();
      expect(mockDb.ismsReviewInput.delete).not.toHaveBeenCalled();
    });

    it('deletes rows (including seeded ones) on an unsigned review', async () => {
      (mockDb.ismsReviewInput.findFirst as jest.Mock).mockResolvedValue({
        id: 'mri_1',
        documentId: 'doc_1',
        review: UNSIGNED_REVIEW,
      });
      (mockDb.ismsReviewInput.delete as jest.Mock).mockResolvedValue({});

      const result = await service.remove({
        inputId: 'mri_1',
        organizationId: 'org_1',
      });
      expect(result).toEqual({ success: true });
      expect(mockDb.ismsReviewInput.delete).toHaveBeenCalledWith({
        where: { id: 'mri_1' },
      });
    });
  });
});
