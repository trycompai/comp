import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { PolicyPdfRendererService } from '../trust-portal/policy-pdf-renderer.service';
import { TimelinesService } from '../timelines/timelines.service';

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
  BackgroundCheckStatus: {
    pending: 'pending',
    in_progress: 'in_progress',
    completed: 'completed',
    completed_with_flags: 'completed_with_flags',
    failed: 'failed',
  },
  FindingType: {
    soc2: 'soc2',
    iso27001: 'iso27001',
    hipaa: 'hipaa',
    gdpr: 'gdpr',
    cloud_security: 'cloud_security',
    vendor: 'vendor',
    other: 'other',
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

jest.mock('../app/s3', () => ({
  BUCKET_NAME: 'test-bucket',
  s3Client: {
    send: jest.fn(),
  },
  getSignedUrl: jest.fn(async () => 'https://test-bucket.s3.amazonaws.com/signed-url'),
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { s3Client: mockedS3Client, getSignedUrl: mockedGetSignedUrl } = require('../app/s3') as {
  s3Client: { send: jest.Mock };
  getSignedUrl: jest.Mock;
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
        // TimelinesService is injected for timeline auto-completion hooks;
        // tests don't exercise that path so a bare stub is enough.
        { provide: TimelinesService, useValue: {} },
      ],
    }).compile();
    service = module.get<PoliciesService>(PoliciesService);
  });

  describe('findAll', () => {
    const orgId = 'org_abc';

    beforeEach(() => {
      db.policy.findMany.mockResolvedValue([]);
    });

    it('includes content and draftContent in the select by default', async () => {
      await service.findAll(orgId);

      const callArgs = db.policy.findMany.mock.calls[0][0];
      expect(callArgs.select.content).toBe(true);
      expect(callArgs.select.draftContent).toBe(true);
    });

    it('includes content and draftContent when excludeContent is false', async () => {
      await service.findAll(orgId, { excludeContent: false });

      const callArgs = db.policy.findMany.mock.calls[0][0];
      expect(callArgs.select.content).toBe(true);
      expect(callArgs.select.draftContent).toBe(true);
    });

    it('omits content and draftContent from select when excludeContent is true', async () => {
      await service.findAll(orgId, { excludeContent: true });

      const callArgs = db.policy.findMany.mock.calls[0][0];
      expect(callArgs.select.content).toBeUndefined();
      expect(callArgs.select.draftContent).toBeUndefined();
      // Other fields still selected
      expect(callArgs.select.id).toBe(true);
      expect(callArgs.select.name).toBe(true);
      expect(callArgs.select.status).toBe(true);
      expect(callArgs.select.currentVersionId).toBe(true);
    });

    it('scopes results to the organization regardless of excludeContent', async () => {
      await service.findAll(orgId, { excludeContent: true });

      const callArgs = db.policy.findMany.mock.calls[0][0];
      expect(callArgs.where.organizationId).toBe(orgId);
      expect(callArgs.where.isArchived).toBe(false);
      expect(callArgs.where.archivedAt).toBeNull();
    });
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

    // Auto-route: content update on a non-draft policy creates a new
    // PolicyVersion and publishes it, rather than mutating the published
    // version's content in place. This lets MCP/API consumers say
    // "update the policy" without thinking about version mechanics.
    describe('auto-route for published content updates', () => {
      const orgId = 'org_abc';
      const policyId = 'pol_1';
      const newContent = [{ type: 'paragraph', content: [{ type: 'text', text: 'fresh content' }] }];

      const mockAutoRouteTx = () => {
        db.$transaction.mockImplementation(
          async (callback: (tx: unknown) => Promise<unknown>) => {
            const tx = {
              policy: {
                findFirst: db.policy.findFirst,
                update: db.policy.update,
              },
              policyVersion: {
                findFirst: db.policyVersion.findFirst,
                create: db.policyVersion.create,
              },
            };
            return callback(tx);
          },
        );
      };

      it('creates a new version and publishes it when content is updated on a published policy', async () => {
        const existing = {
          id: policyId,
          status: 'published',
          pendingVersionId: null,
          approverId: null,
          frequency: 'yearly',
          pdfUrl: 'existing.pdf',
        };
        db.policy.findFirst.mockResolvedValueOnce(existing);
        db.policyVersion.findFirst.mockResolvedValueOnce({ version: 3 });
        db.policyVersion.create.mockResolvedValueOnce({ id: 'pv_new', version: 4 });
        db.policy.update.mockResolvedValueOnce({
          id: policyId,
          name: 'Test',
          status: 'published',
          currentVersionId: 'pv_new',
        });
        mockAutoRouteTx();

        await service.updateById(policyId, orgId, { content: newContent } as never);

        // A new PolicyVersion was created with the new content + next version number
        expect(db.policyVersion.create).toHaveBeenCalledTimes(1);
        const versionCreateArg = db.policyVersion.create.mock.calls[0][0];
        expect(versionCreateArg.data.policyId).toBe(policyId);
        expect(versionCreateArg.data.version).toBe(4);
        expect(versionCreateArg.data.content).toEqual(newContent);
        expect(versionCreateArg.data.pdfUrl).toBe('existing.pdf');

        // The Policy row was synced to the new published version
        const policyUpdateArg = db.policy.update.mock.calls[0][0];
        expect(policyUpdateArg.data.content).toEqual(newContent);
        expect(policyUpdateArg.data.draftContent).toEqual(newContent);
        expect(policyUpdateArg.data.currentVersionId).toBe('pv_new');
        expect(policyUpdateArg.data.status).toBe('published');
        expect(policyUpdateArg.data.signedBy).toEqual([]);
        expect(policyUpdateArg.data.pendingVersionId).toBeNull();
        expect(policyUpdateArg.data.approverId).toBeNull();
      });

      it('auto-routes for needs_review status as well', async () => {
        const existing = {
          id: policyId,
          status: 'needs_review',
          pendingVersionId: null,
          approverId: null,
          frequency: null,
          pdfUrl: null,
        };
        db.policy.findFirst.mockResolvedValueOnce(existing);
        db.policyVersion.findFirst.mockResolvedValueOnce({ version: 1 });
        db.policyVersion.create.mockResolvedValueOnce({ id: 'pv_new', version: 2 });
        db.policy.update.mockResolvedValueOnce({ id: policyId, status: 'published' });
        mockAutoRouteTx();

        await service.updateById(policyId, orgId, { content: newContent } as never);

        expect(db.policyVersion.create).toHaveBeenCalledTimes(1);
        const policyUpdateArg = db.policy.update.mock.calls[0][0];
        expect(policyUpdateArg.data.status).toBe('published');
      });

      it('blocks the auto-route when an approval is pending', async () => {
        const existing = {
          id: policyId,
          status: 'published',
          pendingVersionId: 'pv_pending',
          approverId: 'mem_approver',
          frequency: 'yearly',
          pdfUrl: null,
        };
        db.policy.findFirst.mockResolvedValueOnce(existing);
        mockAutoRouteTx();

        await expect(
          service.updateById(policyId, orgId, { content: newContent } as never),
        ).rejects.toThrow(/approval is pending/);
        expect(db.policyVersion.create).not.toHaveBeenCalled();
        expect(db.policy.update).not.toHaveBeenCalled();
      });

      it('blocks content updates that also demote status (mixed intent)', async () => {
        const existing = {
          id: policyId,
          status: 'published',
          pendingVersionId: null,
          approverId: null,
          frequency: 'yearly',
          pdfUrl: null,
        };
        db.policy.findFirst.mockResolvedValueOnce(existing);
        mockAutoRouteTx();

        await expect(
          service.updateById(policyId, orgId, {
            content: newContent,
            status: 'draft',
          } as never),
        ).rejects.toThrow(/Cannot update content of a published policy/);
        expect(db.policyVersion.create).not.toHaveBeenCalled();
        expect(db.policy.update).not.toHaveBeenCalled();
      });

      it('does not auto-route when only non-content fields change on a published policy', async () => {
        const existing = {
          id: policyId,
          status: 'published',
          pendingVersionId: null,
          approverId: null,
          frequency: 'yearly',
          pdfUrl: null,
        };
        db.policy.findFirst.mockResolvedValueOnce(existing);
        db.policy.update.mockResolvedValueOnce({
          id: policyId,
          name: 'Renamed',
          status: 'published',
        });
        mockAutoRouteTx();

        await service.updateById(policyId, orgId, { description: 'tweak' } as never);

        // No new version created — just a normal Policy update
        expect(db.policyVersion.create).not.toHaveBeenCalled();
        expect(db.policy.update).toHaveBeenCalledTimes(1);
      });
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

  describe('acceptChanges', () => {
    const buildPendingPolicy = (overrides: Record<string, unknown> = {}) => ({
      id: 'pol_1',
      organizationId: 'org_abc',
      pendingVersionId: 'ver_1',
      approverId: 'mem_approver',
      frequency: 'yearly',
      ...overrides,
    });

    const mockTransactionTx = () => {
      db.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            policyVersion: { update: db.policyVersion.update },
            policy: { update: db.policy.update },
          };
          return callback(tx);
        },
      );
    };

    it('publishes the pending version on a successful approve', async () => {
      const pendingVersion = {
        id: 'ver_1',
        version: 2,
        content: [{ type: 'paragraph' }],
      };
      db.policy.findUnique.mockResolvedValueOnce(buildPendingPolicy());
      db.policyVersion.findUnique.mockResolvedValueOnce(pendingVersion);
      db.member.findFirst.mockResolvedValueOnce({ id: 'mem_caller' });
      mockTransactionTx();

      const result = await service.acceptChanges(
        'pol_1',
        'org_abc',
        { approverId: 'mem_approver' },
        'usr_caller',
      );

      expect(result).toEqual({ versionId: 'ver_1', version: 2 });
      expect(db.policyVersion.update).toHaveBeenCalledWith({
        where: { id: 'ver_1' },
        data: { publishedById: 'mem_caller' },
      });
      const policyUpdateArg = db.policy.update.mock.calls[0][0];
      expect(policyUpdateArg.data.status).toBe('published');
      expect(policyUpdateArg.data.currentVersionId).toBe('ver_1');
      expect(policyUpdateArg.data.pendingVersionId).toBeNull();
      expect(policyUpdateArg.data.approverId).toBeNull();
      expect(policyUpdateArg.data.signedBy).toEqual([]);
    });

    it('succeeds when called via session impersonation — caller userId differs from approverId', async () => {
      // Simulates an admin impersonating the assigned approver:
      // the impersonated session's userId belongs to the approver, but
      // the authorization check only requires the body-supplied approverId
      // to match policy.approverId — which it does.
      const pendingVersion = {
        id: 'ver_1',
        version: 2,
        content: [],
      };
      db.policy.findUnique.mockResolvedValueOnce(buildPendingPolicy());
      db.policyVersion.findUnique.mockResolvedValueOnce(pendingVersion);
      db.member.findFirst.mockResolvedValueOnce({ id: 'mem_impersonated' });
      mockTransactionTx();

      const result = await service.acceptChanges(
        'pol_1',
        'org_abc',
        { approverId: 'mem_approver' },
        'usr_impersonated',
      );

      expect(result).toEqual({ versionId: 'ver_1', version: 2 });
      expect(db.policyVersion.update).toHaveBeenCalledWith({
        where: { id: 'ver_1' },
        data: { publishedById: 'mem_impersonated' },
      });
    });

    it('rejects when the body approverId does not match the assigned approver', async () => {
      db.policy.findUnique.mockResolvedValueOnce(buildPendingPolicy());

      await expect(
        service.acceptChanges('pol_1', 'org_abc', { approverId: 'mem_wrong' }),
      ).rejects.toThrow(/only the assigned approver/i);

      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('self-heals stale approverId when no pending version exists', async () => {
      const orgId = 'org_abc';
      const approverId = 'mem_approver';
      const stalePolicy = {
        id: 'pol_1',
        organizationId: orgId,
        pendingVersionId: null,
        approverId,
      };
      db.policy.findUnique.mockResolvedValueOnce(stalePolicy);
      db.policy.update.mockResolvedValueOnce({ ...stalePolicy, approverId: null });

      await expect(
        service.acceptChanges('pol_1', orgId, { approverId }),
      ).rejects.toThrow(/no pending changes/i);

      expect(db.policy.update).toHaveBeenCalledWith({
        where: { id: 'pol_1' },
        data: { approverId: null },
      });
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('throws without mutating when the policy has no approval state at all', async () => {
      const orgId = 'org_abc';
      const cleanPolicy = {
        id: 'pol_1',
        organizationId: orgId,
        pendingVersionId: null,
        approverId: null,
      };
      db.policy.findUnique.mockResolvedValueOnce(cleanPolicy);

      await expect(
        service.acceptChanges('pol_1', orgId, { approverId: 'mem_x' }),
      ).rejects.toThrow(/no pending version/i);

      expect(db.policy.update).not.toHaveBeenCalled();
    });
  });

  describe('denyChanges', () => {
    it('reverts to draft on a successful deny when never published', async () => {
      db.policy.findUnique.mockResolvedValueOnce({
        id: 'pol_1',
        organizationId: 'org_abc',
        pendingVersionId: 'ver_1',
        approverId: 'mem_approver',
        lastPublishedAt: null,
      });
      db.policy.update.mockResolvedValueOnce({});

      const result = await service.denyChanges('pol_1', 'org_abc', {
        approverId: 'mem_approver',
      });

      expect(result).toEqual({ status: 'draft' });
      expect(db.policy.update).toHaveBeenCalledWith({
        where: { id: 'pol_1' },
        data: {
          status: 'draft',
          pendingVersionId: null,
          approverId: null,
        },
      });
    });

    it('reverts to published on a successful deny when previously published', async () => {
      db.policy.findUnique.mockResolvedValueOnce({
        id: 'pol_1',
        organizationId: 'org_abc',
        pendingVersionId: 'ver_2',
        approverId: 'mem_approver',
        lastPublishedAt: new Date('2026-01-01'),
      });
      db.policy.update.mockResolvedValueOnce({});

      const result = await service.denyChanges('pol_1', 'org_abc', {
        approverId: 'mem_approver',
      });

      expect(result).toEqual({ status: 'published' });
    });

    it('self-heals stale approverId when no pending version exists', async () => {
      const orgId = 'org_abc';
      const approverId = 'mem_approver';
      const stalePolicy = {
        id: 'pol_1',
        organizationId: orgId,
        pendingVersionId: null,
        approverId,
      };
      db.policy.findUnique.mockResolvedValueOnce(stalePolicy);
      db.policy.update.mockResolvedValueOnce({ ...stalePolicy, approverId: null });

      await expect(
        service.denyChanges('pol_1', orgId, { approverId }),
      ).rejects.toThrow(/no pending changes/i);

      expect(db.policy.update).toHaveBeenCalledWith({
        where: { id: 'pol_1' },
        data: { approverId: null },
      });
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

  describe('publishVersion', () => {
    const policyId = 'pol_1';
    const organizationId = 'org_abc';
    const userId = 'usr_caller';

    const draftContent = [{ type: 'paragraph', content: [{ type: 'text', text: 'old draft' }] }];
    const versionContent = [{ type: 'paragraph', content: [{ type: 'text', text: 'fresh version content' }] }];

    const buildPolicy = (overrides: Record<string, unknown> = {}) => ({
      id: policyId,
      organizationId,
      content: [],
      draftContent,
      pdfUrl: null,
      frequency: null,
      pendingVersionId: null,
      approverId: null,
      versions: [],
      ...overrides,
    });

    const mockTransactionTx = () => {
      db.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            policyVersion: {
              findFirst: db.policyVersion.findFirst,
              create: db.policyVersion.create,
              update: db.policyVersion.update,
            },
            policy: { update: db.policy.update },
          };
          return callback(tx);
        },
      );
    };

    it('publishes the specified version IN PLACE without creating a new version (MCP/API flow)', async () => {
      // The fix: publishing a specific versionId must activate THAT version, not
      // snapshot a duplicate. Mirrors the UI's accept-changes / set-active behavior.
      db.member.findFirst.mockResolvedValueOnce({ id: 'mem_caller' });
      db.policy.findUnique.mockResolvedValueOnce(buildPolicy());
      db.policyVersion.findUnique.mockResolvedValueOnce({
        id: 'pv_target',
        policyId,
        content: versionContent,
        version: 7,
        pdfUrl: 'org_abc/policies/pol_1/v7-doc.pdf',
      });
      mockTransactionTx();

      const result = await service.publishVersion(
        policyId,
        organizationId,
        { versionId: 'pv_target', changelog: 'via MCP' },
        userId,
      );

      // Returns the EXISTING version — NO new version created
      expect(result).toEqual({ versionId: 'pv_target', version: 7 });
      expect(db.policyVersion.create).not.toHaveBeenCalled();

      // The existing version becomes the active/current version
      const updateArg = db.policy.update.mock.calls[0][0];
      expect(updateArg.data.currentVersionId).toBe('pv_target');
      expect(updateArg.data.content).toEqual(versionContent);
      expect(updateArg.data.draftContent).toEqual(versionContent);
      expect(updateArg.data.status).toBe('published');
      // The version's PDF is propagated so the published policy shows it
      expect(updateArg.data.pdfUrl).toBe('org_abc/policies/pol_1/v7-doc.pdf');
      expect(updateArg.data.displayFormat).toBe('PDF');

      // The version is stamped with who published it
      expect(db.policyVersion.update).toHaveBeenCalledWith({
        where: { id: 'pv_target' },
        data: { publishedById: 'mem_caller' },
      });
    });

    it('sets displayFormat to EDITOR when the published version has no PDF', async () => {
      db.member.findFirst.mockResolvedValueOnce({ id: 'mem_caller' });
      db.policy.findUnique.mockResolvedValueOnce(buildPolicy());
      db.policyVersion.findUnique.mockResolvedValueOnce({
        id: 'pv_target',
        policyId,
        content: versionContent,
        version: 3,
        pdfUrl: null,
      });
      mockTransactionTx();

      await service.publishVersion(
        policyId,
        organizationId,
        { versionId: 'pv_target' },
        userId,
      );

      const updateArg = db.policy.update.mock.calls[0][0];
      expect(updateArg.data.pdfUrl).toBeNull();
      expect(updateArg.data.displayFormat).toBe('EDITOR');
      expect(db.policyVersion.create).not.toHaveBeenCalled();
    });

    it('publishes from draftContent when versionId is omitted (existing UI flow)', async () => {
      db.member.findFirst.mockResolvedValueOnce({ id: 'mem_caller' });
      db.policy.findUnique.mockResolvedValueOnce(buildPolicy());
      db.policyVersion.findFirst.mockResolvedValueOnce({ version: 1 });
      db.policyVersion.create.mockResolvedValueOnce({ id: 'pv_new', version: 2 });
      mockTransactionTx();

      const result = await service.publishVersion(
        policyId,
        organizationId,
        { changelog: 'via UI' },
        userId,
      );

      expect(result).toEqual({ versionId: 'pv_new', version: 2 });
      // Existing behavior preserved — content came from policy.draftContent
      const createArg = db.policyVersion.create.mock.calls[0][0];
      expect(createArg.data.content).toEqual(draftContent);
      // PolicyVersion lookup was NOT performed in this path
      expect(db.policyVersion.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFound when versionId refers to a version on a different policy', async () => {
      db.member.findFirst.mockResolvedValueOnce({ id: 'mem_caller' });
      db.policy.findUnique.mockResolvedValueOnce(buildPolicy());
      db.policyVersion.findUnique.mockResolvedValueOnce({
        id: 'pv_other',
        policyId: 'pol_other',
        content: versionContent,
      });

      await expect(
        service.publishVersion(
          policyId,
          organizationId,
          { versionId: 'pv_other' },
          userId,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('throws when the policy has an approval pending (guard before content read)', async () => {
      db.member.findFirst.mockResolvedValueOnce({ id: 'mem_caller' });
      db.policy.findUnique.mockResolvedValueOnce(
        buildPolicy({ pendingVersionId: 'pv_pending', approverId: 'mem_approver' }),
      );

      await expect(
        service.publishVersion(
          policyId,
          organizationId,
          { versionId: 'pv_target' },
          userId,
        ),
      ).rejects.toThrow(/approval is pending/);
      // Guard runs before any version lookup or transaction
      expect(db.policyVersion.findUnique).not.toHaveBeenCalled();
      expect(db.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('generatePolicyPdfUploadUrl', () => {
    const orgId = 'org_abc';
    const policyId = 'pol_xyz';

    beforeEach(() => {
      mockedGetSignedUrl.mockResolvedValue('https://signed.example/url');
    });

    it('returns a presigned URL and an org+policy-scoped s3Key for a basic upload', async () => {
      db.policy.findFirst.mockResolvedValue({
        id: policyId,
        status: 'draft',
        currentVersionId: null,
        pendingVersionId: null,
      });

      const result = await service.generatePolicyPdfUploadUrl(policyId, orgId, {
        fileName: 'My Policy.pdf',
        fileType: 'application/pdf',
      });

      expect(result.uploadUrl).toBe('https://signed.example/url');
      expect(result.s3Key.startsWith(`${orgId}/policies/${policyId}/`)).toBe(true);
      expect(result.s3Key).toContain('My_Policy.pdf');
      expect(result.expiresIn).toBe(900);
    });

    it('rejects non-PDF fileType', async () => {
      await expect(
        service.generatePolicyPdfUploadUrl(policyId, orgId, {
          fileName: 'evil.exe',
          fileType: 'application/x-msdownload',
        }),
      ).rejects.toThrow(/application\/pdf/);
      // Policy lookup never happens for invalid type
      expect(db.policy.findFirst).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when policy does not exist', async () => {
      db.policy.findFirst.mockResolvedValue(null);

      await expect(
        service.generatePolicyPdfUploadUrl(policyId, orgId, {
          fileName: 'x.pdf',
          fileType: 'application/pdf',
        }),
      ).rejects.toThrow(/Policy not found/);
    });

    it('includes the version number prefix in the s3Key when versionId is provided', async () => {
      db.policy.findFirst.mockResolvedValue({
        id: policyId,
        status: 'draft',
        currentVersionId: null,
        pendingVersionId: null,
      });
      db.policyVersion.findFirst.mockResolvedValue({
        id: 'pv_v3',
        version: 3,
      });

      const result = await service.generatePolicyPdfUploadUrl(policyId, orgId, {
        fileName: 'x.pdf',
        fileType: 'application/pdf',
        versionId: 'pv_v3',
      });

      expect(result.s3Key).toContain('/v3-');
    });

    it('rejects uploading to the published version', async () => {
      db.policy.findFirst.mockResolvedValue({
        id: policyId,
        status: 'published',
        currentVersionId: 'pv_current',
        pendingVersionId: null,
      });
      db.policyVersion.findFirst.mockResolvedValue({
        id: 'pv_current',
        version: 1,
      });

      await expect(
        service.generatePolicyPdfUploadUrl(policyId, orgId, {
          fileName: 'x.pdf',
          fileType: 'application/pdf',
          versionId: 'pv_current',
        }),
      ).rejects.toThrow(/published version/);
    });

    it('rejects policy-level upload (no versionId) when policy is published — must create a new version first', async () => {
      db.policy.findFirst.mockResolvedValue({
        id: policyId,
        status: 'published',
        currentVersionId: 'pv_current',
        pendingVersionId: null,
      });

      await expect(
        service.generatePolicyPdfUploadUrl(policyId, orgId, {
          fileName: 'x.pdf',
          fileType: 'application/pdf',
        }),
      ).rejects.toThrow(/create a new draft version via create-policy-version/);
      // The mocked S3 must NOT have been hit
      expect(mockedGetSignedUrl).not.toHaveBeenCalled();
    });

    it('allows policy-level upload (no versionId) when policy is in draft', async () => {
      db.policy.findFirst.mockResolvedValue({
        id: policyId,
        status: 'draft',
        currentVersionId: null,
        pendingVersionId: null,
      });

      const result = await service.generatePolicyPdfUploadUrl(policyId, orgId, {
        fileName: 'x.pdf',
        fileType: 'application/pdf',
      });

      expect(result.s3Key.startsWith(`${orgId}/policies/${policyId}/`)).toBe(true);
      expect(result.s3Key).not.toContain('/v'); // no version prefix
    });

    it('rejects uploading to a version pending approval', async () => {
      db.policy.findFirst.mockResolvedValue({
        id: policyId,
        status: 'draft',
        currentVersionId: null,
        pendingVersionId: 'pv_pending',
      });
      db.policyVersion.findFirst.mockResolvedValue({
        id: 'pv_pending',
        version: 2,
      });

      await expect(
        service.generatePolicyPdfUploadUrl(policyId, orgId, {
          fileName: 'x.pdf',
          fileType: 'application/pdf',
          versionId: 'pv_pending',
        }),
      ).rejects.toThrow(/pending approval/);
    });
  });

  describe('confirmPolicyPdfUploaded', () => {
    const orgId = 'org_abc';
    const policyId = 'pol_xyz';
    const validKey = `${orgId}/policies/${policyId}/123-test.pdf`;

    beforeEach(() => {
      mockedS3Client.send.mockReset();
      mockedS3Client.send.mockResolvedValue({ ContentLength: 1024 });
    });

    it('rejects an s3Key that does not belong to this org+policy (cross-tenant defense)', async () => {
      await expect(
        service.confirmPolicyPdfUploaded(policyId, orgId, {
          s3Key: 'other_org/policies/pol_other/something.pdf',
        }),
      ).rejects.toThrow(/does not belong to this policy/);
      // Defense runs before any S3 or DB hit
      expect(mockedS3Client.send).not.toHaveBeenCalled();
      expect(db.policy.findFirst).not.toHaveBeenCalled();
    });

    it('rejects when S3 has no object at the given key', async () => {
      db.policy.findFirst.mockResolvedValue({
        id: policyId,
        pdfUrl: null,
        currentVersionId: null,
      });
      mockedS3Client.send.mockRejectedValueOnce(new Error('NotFound'));

      await expect(
        service.confirmPolicyPdfUploaded(policyId, orgId, { s3Key: validKey }),
      ).rejects.toThrow(/No file found/);
    });

    it('updates Policy.pdfUrl and switches displayFormat to PDF when no versionId given (draft policy)', async () => {
      db.policy.findFirst.mockResolvedValue({
        id: policyId,
        status: 'draft',
        pdfUrl: null,
        currentVersionId: null,
      });
      db.policy.update.mockResolvedValue({});

      const result = await service.confirmPolicyPdfUploaded(policyId, orgId, {
        s3Key: validKey,
      });

      expect(result).toEqual({ success: true, pdfUrl: validKey });
      expect(db.policy.update).toHaveBeenCalledWith({
        where: { id: policyId },
        data: { pdfUrl: validKey, displayFormat: 'PDF' },
      });
    });

    it('rejects policy-level confirm when policy is published — must use a version', async () => {
      db.policy.findFirst.mockResolvedValue({
        id: policyId,
        status: 'published',
        pdfUrl: null,
        currentVersionId: 'pv_current',
      });

      await expect(
        service.confirmPolicyPdfUploaded(policyId, orgId, { s3Key: validKey }),
      ).rejects.toThrow(/create a new draft version via create-policy-version/);
      // No DB write happened
      expect(db.policy.update).not.toHaveBeenCalled();
      // S3 HEAD shouldn't have been called either (guard runs first)
      expect(mockedS3Client.send).not.toHaveBeenCalled();
    });

    it('updates PolicyVersion.pdfUrl and NOT Policy when versionId is provided', async () => {
      db.policy.findFirst.mockResolvedValue({
        id: policyId,
        pdfUrl: null,
        currentVersionId: null,
      });
      db.policyVersion.findFirst.mockResolvedValue({
        id: 'pv_v1',
        pdfUrl: null,
      });
      db.policyVersion.update.mockResolvedValue({});

      const result = await service.confirmPolicyPdfUploaded(policyId, orgId, {
        s3Key: validKey,
        versionId: 'pv_v1',
      });

      expect(result).toEqual({
        success: true,
        pdfUrl: validKey,
        versionId: 'pv_v1',
      });
      expect(db.policyVersion.update).toHaveBeenCalledWith({
        where: { id: 'pv_v1' },
        data: { pdfUrl: validKey },
      });
      expect(db.policy.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when policy is missing', async () => {
      db.policy.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmPolicyPdfUploaded(policyId, orgId, { s3Key: validKey }),
      ).rejects.toThrow(/Policy not found/);
    });

    it('throws NotFoundException when versionId provided but version not found', async () => {
      db.policy.findFirst.mockResolvedValue({
        id: policyId,
        pdfUrl: null,
        currentVersionId: null,
      });
      db.policyVersion.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmPolicyPdfUploaded(policyId, orgId, {
          s3Key: validKey,
          versionId: 'pv_missing',
        }),
      ).rejects.toThrow(/Version not found/);
    });
  });
});
