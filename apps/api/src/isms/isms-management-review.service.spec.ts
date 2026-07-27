import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsManagementReviewService } from './isms-management-review.service';
import {
  DEFAULT_REVIEW_CHANGES_TEXT,
  DEFAULT_REVIEW_DECISIONS_TEXT,
} from './documents/management-review-defaults';

jest.mock('@db', () => {
  const db = {
    ismsDocument: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ismsManagementReview: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ismsReviewInput: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    ismsRole: {
      findMany: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(db)),
  };
  return { db };
});

const mockDb = jest.mocked(db);
const currentYear = new Date().getUTCFullYear();

const TOP_MGMT_ROLE = {
  roleKey: 'top_management',
  assignments: [{ memberId: 'mem_ceo' }],
};
const SPO_ROLE = { roleKey: 'spo', assignments: [{ memberId: 'mem_spo' }] };
const MEMBERS = [
  { id: 'mem_ceo', user: { name: 'Raoul Plickat', email: 'ceo@acme.io' } },
  { id: 'mem_spo', user: { name: 'Alex Petrisor', email: 'spo@acme.io' } },
];

describe('IsmsManagementReviewService', () => {
  let service: IsmsManagementReviewService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
      status: 'draft',
    });
    (mockDb.ismsManagementReview.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.ismsReviewInput.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.ismsReviewInput.createMany as jest.Mock).mockResolvedValue({
      count: 10,
    });
    (mockDb.ismsRole.findMany as jest.Mock).mockResolvedValue([
      TOP_MGMT_ROLE,
      SPO_ROLE,
    ]);
    (mockDb.member.findMany as jest.Mock).mockResolvedValue(MEMBERS);
    (mockDb.member.count as jest.Mock).mockResolvedValue(0);
    service = new IsmsManagementReviewService();
  });

  describe('create', () => {
    const args = { documentId: 'doc_1', organizationId: 'org_1', dto: {} };

    beforeEach(() => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (mockDb.ismsManagementReview.create as jest.Mock).mockResolvedValue({
        id: 'mr_1',
      });
    });

    it('throws NotFoundException when the management-review document is missing', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.create(args)).rejects.toThrow(NotFoundException);
      expect(mockDb.ismsDocument.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'doc_1',
          organizationId: 'org_1',
          type: 'management_review',
        },
      });
    });

    it('creates a review with template defaults, Roles-driven participants, and a generated reference', async () => {
      await service.create(args);

      expect(mockDb.ismsManagementReview.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentId: 'doc_1',
          reference: `MR-${currentYear}-01`,
          chairName: 'Raoul Plickat',
          attendees: [
            { memberId: 'mem_ceo', name: 'Raoul Plickat' },
            { memberId: 'mem_spo', name: 'Alex Petrisor' },
          ],
          decisionsText: DEFAULT_REVIEW_DECISIONS_TEXT,
          changesText: DEFAULT_REVIEW_CHANGES_TEXT,
          position: 0,
        }),
      });
    });

    it('dedupes chair + SPO into one attendee when the same person holds both roles', async () => {
      (mockDb.ismsRole.findMany as jest.Mock).mockResolvedValue([
        TOP_MGMT_ROLE,
        { roleKey: 'spo', assignments: [{ memberId: 'mem_ceo' }] },
      ]);

      await service.create(args);

      const { data } = (mockDb.ismsManagementReview.create as jest.Mock).mock
        .calls[0][0];
      expect(data.attendees).toEqual([
        { memberId: 'mem_ceo', name: 'Raoul Plickat' },
      ]);
    });

    it('leaves chair and attendees empty when Roles has no holders yet', async () => {
      (mockDb.ismsRole.findMany as jest.Mock).mockResolvedValue([]);

      await service.create(args);

      const { data } = (mockDb.ismsManagementReview.create as jest.Mock).mock
        .calls[0][0];
      expect(data.chairName).toBeNull();
      expect(data.attendees).toEqual([]);
    });

    it('prefers explicit dto values over the Roles defaults', async () => {
      (mockDb.member.count as jest.Mock).mockResolvedValue(1);

      await service.create({
        ...args,
        dto: {
          chairName: 'External Chair',
          attendees: [{ memberId: 'mem_spo', name: 'Alex Petrisor' }],
        },
      });

      const { data } = (mockDb.ismsManagementReview.create as jest.Mock).mock
        .calls[0][0];
      expect(data.chairName).toBe('External Chair');
      expect(data.attendees).toEqual([
        { memberId: 'mem_spo', name: 'Alex Petrisor' },
      ]);
    });

    it('rejects attendees who are not members of the organization', async () => {
      (mockDb.member.count as jest.Mock).mockResolvedValue(0);

      await expect(
        service.create({
          ...args,
          dto: { attendees: [{ memberId: 'mem_other_org', name: 'Mallory' }] },
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.ismsManagementReview.create).not.toHaveBeenCalled();
    });

    it('seeds the ten default Inputs rows in the same transaction', async () => {
      await service.create(args);

      const { data } = (mockDb.ismsReviewInput.createMany as jest.Mock).mock
        .calls[0][0];
      expect(data).toHaveLength(10);
      expect(data[0]).toMatchObject({
        reviewId: 'mr_1',
        documentId: 'doc_1',
        inputKey: 'a_prior_actions',
      });
    });

    it('continues the per-year sequence from the highest existing reference', async () => {
      (mockDb.ismsManagementReview.findMany as jest.Mock).mockResolvedValue([
        { reference: `MR-${currentYear}-01` },
        { reference: `MR-${currentYear}-03` },
      ]);
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue({
        position: 2,
      });

      await service.create(args);

      expect(mockDb.ismsManagementReview.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reference: `MR-${currentYear}-04`,
          position: 3,
        }),
      });
    });
  });

  describe('update', () => {
    const unsignedReview = {
      id: 'mr_1',
      documentId: 'doc_1',
      reference: `MR-${currentYear}-01`,
      signoffChairName: null,
      signoffChairDate: null,
    };
    const signedReview = {
      ...unsignedReview,
      signoffChairName: 'Raoul Plickat',
      signoffChairDate: new Date('2026-05-01T00:00:00.000Z'),
    };

    beforeEach(() => {
      (mockDb.ismsManagementReview.update as jest.Mock).mockResolvedValue({});
      // The signed-state re-read UNDER the document lock (TOCTOU guard).
      (
        mockDb.ismsManagementReview.findUniqueOrThrow as jest.Mock
      ).mockResolvedValue(unsignedReview);
    });

    it('updates fields on an unsigned review, leaving omitted fields untouched', async () => {
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        unsignedReview,
      );

      await service.update({
        reviewId: 'mr_1',
        organizationId: 'org_1',
        dto: { status: 'complete', conclusionVerdict: 'effective' },
      });

      const { data } = (mockDb.ismsManagementReview.update as jest.Mock).mock
        .calls[0][0];
      expect(data.status).toBe('complete');
      expect(data.conclusionVerdict).toBe('effective');
      expect(data.chairName).toBeUndefined();
      expect(data.attendees).toBeUndefined();
      expect(data.decisionsText).toBeUndefined();
    });

    it('rejects edits to a signed review (locked minutes)', async () => {
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        signedReview,
      );
      (
        mockDb.ismsManagementReview.findUniqueOrThrow as jest.Mock
      ).mockResolvedValue(signedReview);

      await expect(
        service.update({
          reviewId: 'mr_1',
          organizationId: 'org_1',
          dto: { conclusionNotes: 'rewriting history' },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsManagementReview.update).not.toHaveBeenCalled();
    });

    it('rejects an edit racing a concurrent sign-off (locked re-read wins over the pre-read)', async () => {
      // Pre-transaction read saw an unsigned review...
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        unsignedReview,
      );
      // ...but by the time the advisory lock is held, the chair has signed.
      (
        mockDb.ismsManagementReview.findUniqueOrThrow as jest.Mock
      ).mockResolvedValue(signedReview);

      await expect(
        service.update({
          reviewId: 'mr_1',
          organizationId: 'org_1',
          dto: { conclusionNotes: 'rewriting history' },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsManagementReview.update).not.toHaveBeenCalled();
    });

    it('still allows correcting or clearing the sign-off slot itself when signed', async () => {
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        signedReview,
      );
      (
        mockDb.ismsManagementReview.findUniqueOrThrow as jest.Mock
      ).mockResolvedValue(signedReview);

      await service.update({
        reviewId: 'mr_1',
        organizationId: 'org_1',
        dto: { signoffChairName: null, signoffChairDate: null },
      });

      const { data } = (mockDb.ismsManagementReview.update as jest.Mock).mock
        .calls[0][0];
      expect(data.signoffChairName).toBeNull();
      expect(data.signoffChairDate).toBeNull();
    });

    it('validates replacement attendees against the organization', async () => {
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        unsignedReview,
      );
      (mockDb.member.count as jest.Mock).mockResolvedValue(0);

      await expect(
        service.update({
          reviewId: 'mr_1',
          organizationId: 'org_1',
          dto: { attendees: [{ memberId: 'mem_other_org', name: 'Mallory' }] },
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.ismsManagementReview.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a review outside the organization', async () => {
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(
        service.update({ reviewId: 'mr_x', organizationId: 'org_1', dto: {} }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.ismsManagementReview.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'mr_x',
          document: { organizationId: 'org_1', type: 'management_review' },
        },
      });
    });
  });

  describe('remove', () => {
    const storedReview = {
      id: 'mr_1',
      documentId: 'doc_1',
      reference: `MR-${currentYear}-01`,
      signoffChairName: null,
      signoffChairDate: null,
    };

    it('deletes an unsigned review (cascading to inputs and actions)', async () => {
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        storedReview,
      );
      (
        mockDb.ismsManagementReview.findUniqueOrThrow as jest.Mock
      ).mockResolvedValue(storedReview);
      (mockDb.ismsManagementReview.delete as jest.Mock).mockResolvedValue({});

      const result = await service.remove({
        reviewId: 'mr_1',
        organizationId: 'org_1',
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.ismsManagementReview.delete).toHaveBeenCalledWith({
        where: { id: 'mr_1' },
      });
    });

    it('refuses to delete a signed review (locked re-read wins over the pre-read)', async () => {
      // Pre-read saw unsigned; the locked re-read sees a committed sign-off.
      (mockDb.ismsManagementReview.findFirst as jest.Mock).mockResolvedValue(
        storedReview,
      );
      (
        mockDb.ismsManagementReview.findUniqueOrThrow as jest.Mock
      ).mockResolvedValue({
        ...storedReview,
        signoffChairName: 'Raoul Plickat',
        signoffChairDate: new Date('2026-05-01T00:00:00.000Z'),
      });

      await expect(
        service.remove({ reviewId: 'mr_1', organizationId: 'org_1' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsManagementReview.delete).not.toHaveBeenCalled();
    });
  });
});
