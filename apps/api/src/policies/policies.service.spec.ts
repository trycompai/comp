import { Test, type TestingModule } from '@nestjs/testing';
import { PoliciesService } from './policies.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { PolicyPdfRendererService } from '../trust-portal/policy-pdf-renderer.service';

jest.mock('@db', () => ({
  db: {
    policy: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  Frequency: {
    monthly: 'monthly',
    quarterly: 'quarterly',
    yearly: 'yearly',
  },
  PolicyStatus: {
    draft: 'draft',
    published: 'published',
    needs_review: 'needs_review',
  },
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
      }
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { db } = require('@db') as {
  db: {
    policy: { findMany: jest.Mock; update: jest.Mock };
    auditLog: { createMany: jest.Mock };
    $transaction: jest.Mock;
  };
};

describe('PoliciesService', () => {
  let service: PoliciesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        { provide: AttachmentsService, useValue: {} },
        { provide: PolicyPdfRendererService, useValue: {} },
      ],
    }).compile();
    service = module.get<PoliciesService>(PoliciesService);
  });

  describe('publishAll', () => {
    it('clears signedBy[] on every published policy and returns { success, publishedCount }', async () => {
      const orgId = 'org_abc';
      const drafts = [
        { id: 'pol_1', name: 'Access', frequency: 'yearly' },
        { id: 'pol_2', name: 'Backup', frequency: null },
      ];
      db.policy.findMany.mockResolvedValueOnce(drafts);
      db.$transaction.mockImplementation((updates: unknown[]) => Promise.resolve(updates));
      db.policy.update.mockImplementation((args) => args);

      const result = await service.publishAll(orgId);

      expect(db.$transaction).toHaveBeenCalledTimes(1);
      const txArg = db.$transaction.mock.calls[0][0] as Array<{
        where: { id: string };
        data: Record<string, unknown>;
      }>;
      expect(txArg).toHaveLength(2);
      for (const update of txArg) {
        expect(update.data.status).toBe('published');
        expect(update.data.signedBy).toEqual([]);
        expect(update.data.lastPublishedAt).toBeInstanceOf(Date);
      }
      expect(result).toEqual({ success: true, publishedCount: 2 });
      expect(result).not.toHaveProperty('members');
    });

    it('returns early with publishedCount 0 when there are no drafts', async () => {
      db.policy.findMany.mockResolvedValueOnce([]);
      const result = await service.publishAll('org_empty');
      expect(result).toEqual({ success: true, publishedCount: 0 });
      expect(db.$transaction).not.toHaveBeenCalled();
    });
  });
});
