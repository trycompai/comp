import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { PolicyPdfRendererService } from '../trust-portal/policy-pdf-renderer.service';

jest.mock('@db', () => ({
  db: {
    policy: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    policyVersion: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
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

jest.mock('../utils/compliance-filters', () => ({
  filterComplianceMembers: jest.fn(async (members: unknown[]) => members),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { db } = require('@db') as {
  db: {
    policy: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    policyVersion: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    member: { findMany: jest.Mock; findFirst: jest.Mock };
    auditLog: { createMany: jest.Mock };
    $transaction: jest.Mock;
  };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { filterComplianceMembers: mockedFilterComplianceMembers } = require('../utils/compliance-filters') as {
  filterComplianceMembers: jest.Mock;
};

describe('PoliciesService', () => {
  let service: PoliciesService;

  const mockAttachmentsService = {
    copyPolicyVersionPdf: jest.fn(),
    deletePolicyVersionPdf: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        { provide: AttachmentsService, useValue: mockAttachmentsService },
        { provide: PolicyPdfRendererService, useValue: {} },
      ],
    }).compile();
    service = module.get<PoliciesService>(PoliciesService);
  });

  describe('updateById', () => {
    it('clears signedBy[] when the status transitions to published', async () => {
      const orgId = 'org_abc';
      const existing = { id: 'pol_1', organizationId: orgId, status: 'draft' };
      const updatedResult = { ...existing, status: 'published', signedBy: [], name: 'Test Policy' };

      // Make $transaction execute the callback with a tx proxy backed by db mocks
      db.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = { policy: { findFirst: db.policy.findFirst, update: db.policy.update } };
        return callback(tx);
      });
      db.policy.findFirst.mockResolvedValueOnce(existing);
      db.policy.update.mockResolvedValueOnce(updatedResult);

      await service.updateById('pol_1', orgId, { status: 'published' } as never);

      expect(db.policy.update).toHaveBeenCalledTimes(1);
      const updateArg = db.policy.update.mock.calls[0][0];
      expect(updateArg.data.signedBy).toEqual([]);
      expect(updateArg.data.status).toBe('published');
      expect(updateArg.data.lastPublishedAt).toBeInstanceOf(Date);
    });

    it('does not clear signedBy when the policy is already published and status is re-sent', async () => {
      const orgId = 'org_abc';
      const existing = { id: 'pol_1', organizationId: orgId, status: 'published' };
      const updatedResult = { ...existing, description: 'tweak', name: 'Test' };

      db.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = { policy: { findFirst: db.policy.findFirst, update: db.policy.update } };
        return callback(tx);
      });
      db.policy.findFirst.mockResolvedValueOnce(existing);
      db.policy.update.mockResolvedValueOnce(updatedResult);

      await service.updateById('pol_1', orgId, {
        status: 'published',
        description: 'tweak',
      } as never);

      const updateArg = db.policy.update.mock.calls[0][0];
      expect(updateArg.data.signedBy).toBeUndefined();
      expect(updateArg.data.lastPublishedAt).toBeUndefined();
    });

    it('does not clear signedBy[] on non-publish updates', async () => {
      const orgId = 'org_abc';
      const existing = { id: 'pol_1', organizationId: orgId, status: 'published', signedBy: ['usr_a'] };
      const updatedResult = { ...existing, description: 'new desc', name: 'Test Policy' };

      db.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = { policy: { findFirst: db.policy.findFirst, update: db.policy.update } };
        return callback(tx);
      });
      db.policy.findFirst.mockResolvedValueOnce(existing);
      db.policy.update.mockResolvedValueOnce(updatedResult);

      await service.updateById('pol_1', orgId, { description: 'new desc' } as never);

      const updateArg = db.policy.update.mock.calls[0][0];
      expect(updateArg.data.signedBy).toBeUndefined();
    });
  });

  describe('publishAll', () => {
    it('clears signedBy[] on every published policy and returns { success, publishedCount, members }', async () => {
      const orgId = 'org_abc';
      const drafts = [
        { id: 'pol_1', name: 'Access', frequency: 'yearly' },
        { id: 'pol_2', name: 'Backup', frequency: null },
      ];
      db.policy.findMany.mockResolvedValueOnce(drafts);
      db.$transaction.mockImplementation((updates: unknown[]) => Promise.resolve(updates));
      db.policy.update.mockImplementation((args) => args);
      db.member.findMany.mockResolvedValueOnce([]);

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
      expect(result.success).toBe(true);
      expect(result.publishedCount).toBe(2);
      expect(result.members).toEqual([]);
    });

    it('returns early with publishedCount 0 when there are no drafts', async () => {
      db.policy.findMany.mockResolvedValueOnce([]);
      const result = await service.publishAll('org_empty');
      expect(result).toEqual({ success: true, publishedCount: 0, members: [] });
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('returns only compliance-obligated members in the members array', async () => {
      const orgId = 'org_abc';
      db.policy.findMany.mockResolvedValueOnce([
        { id: 'pol_1', name: 'P', frequency: 'yearly' },
      ]);
      db.$transaction.mockImplementation((updates: unknown[]) =>
        Promise.resolve(updates),
      );
      db.policy.update.mockImplementation((args) => args);
      db.member.findMany.mockResolvedValueOnce([
        {
          role: 'employee',
          user: { email: 'alice@example.com', name: 'Alice', role: null },
          organization: { id: orgId, name: 'Acme' },
        },
        {
          role: 'auditor',
          user: { email: 'audit@example.com', name: 'Aud', role: null },
          organization: { id: orgId, name: 'Acme' },
        },
      ]);
      // Mock filterComplianceMembers to return only Alice
      mockedFilterComplianceMembers.mockResolvedValueOnce([
        {
          role: 'employee',
          user: { email: 'alice@example.com', name: 'Alice', role: null },
          organization: { id: orgId, name: 'Acme' },
        },
      ] as never);

      const result = await service.publishAll(orgId);

      expect(result.members).toEqual([
        {
          email: 'alice@example.com',
          userName: 'Alice',
          organizationName: 'Acme',
          organizationId: orgId,
        },
      ]);
    });
  });

  describe('createVersion', () => {
    const organizationId = 'org_123';
    const policyId = 'pol_1';
    const userId = 'usr_1';

    const setupHappyPath = ({
      policyContent,
      currentVersionContent,
      policyPdfUrl,
      currentVersionPdfUrl,
    }: {
      policyContent: unknown[];
      currentVersionContent: unknown[] | null;
      policyPdfUrl: string | null;
      currentVersionPdfUrl: string | null;
    }) => {
      db.member.findFirst.mockResolvedValue({ id: 'mem_1' });
      db.policy.findUnique.mockResolvedValue({
        id: policyId,
        organizationId,
        content: policyContent,
        pdfUrl: policyPdfUrl,
        currentVersion: currentVersionContent
          ? {
              id: 'pv_1',
              content: currentVersionContent,
              pdfUrl: currentVersionPdfUrl,
            }
          : null,
        versions: [],
      });
      db.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          policyVersion: {
            findFirst: jest.fn().mockResolvedValue({ version: 1 }),
            create: jest.fn().mockResolvedValue({ id: 'pv_2' }),
          },
        }),
      );
    };

    it('creates a version when editor content is empty but a PDF exists', async () => {
      setupHappyPath({
        policyContent: [],
        currentVersionContent: [],
        policyPdfUrl: 's3://bucket/policy.pdf',
        currentVersionPdfUrl: 's3://bucket/policy.pdf',
      });
      mockAttachmentsService.copyPolicyVersionPdf.mockResolvedValue(
        's3://bucket/new.pdf',
      );

      const result = await service.createVersion(
        policyId,
        organizationId,
        {},
        userId,
      );

      expect(result).toEqual({ versionId: 'pv_2', version: 2 });
      expect(mockAttachmentsService.copyPolicyVersionPdf).toHaveBeenCalled();
    });

    it('creates a version when both editor content is empty and no PDF exists', async () => {
      setupHappyPath({
        policyContent: [],
        currentVersionContent: [],
        policyPdfUrl: null,
        currentVersionPdfUrl: null,
      });

      const result = await service.createVersion(
        policyId,
        organizationId,
        {},
        userId,
      );

      expect(result).toEqual({ versionId: 'pv_2', version: 2 });
      expect(mockAttachmentsService.copyPolicyVersionPdf).not.toHaveBeenCalled();
    });

    it('creates a version with non-empty editor content', async () => {
      setupHappyPath({
        policyContent: [{ type: 'paragraph' }],
        currentVersionContent: [{ type: 'paragraph' }],
        policyPdfUrl: null,
        currentVersionPdfUrl: null,
      });

      const result = await service.createVersion(
        policyId,
        organizationId,
        {},
        userId,
      );

      expect(result).toEqual({ versionId: 'pv_2', version: 2 });
    });

    it('throws NotFound when the policy does not exist', async () => {
      db.member.findFirst.mockResolvedValue({ id: 'mem_1' });
      db.policy.findUnique.mockResolvedValue(null);

      await expect(
        service.createVersion(policyId, organizationId, {}, userId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
