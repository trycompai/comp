import {
  BadRequestException,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';

jest.mock('@db', () => ({
  AuditLogEntityType: { organization: 'organization' },
  Prisma: {},
  db: {
    organization: { delete: jest.fn() },
    member: { findFirst: jest.fn() },
    apiKey: { count: jest.fn() },
    control: { count: jest.fn() },
    policy: { count: jest.fn() },
    task: { count: jest.fn() },
    auditLog: { count: jest.fn(), create: jest.fn() },
    device: { count: jest.fn() },
    integrationConnection: { count: jest.fn() },
    vendor: { count: jest.fn() },
    risk: { count: jest.fn() },
  },
}));

import { db } from '@db';
import { PurgeOrganizationService } from './purge-organization.service';
import { PurgeOrganizationSnapshotService } from './purge-organization-snapshot.service';
import { PurgeOrganizationExternalService } from './purge-organization-external.service';
import { PurgeSnapshot } from './purge-organization.types';

const mockDb = db as unknown as Record<string, Record<string, jest.Mock>>;

const sampleSnapshot: PurgeSnapshot = {
  organization: { id: 'org_1', name: 'Acme', slug: 'acme' },
  counts: { policies: 5 },
  stripe: { customerId: 'cus_1', subscriptionId: 'sub_1' },
  s3KeysByBucket: { orgAssets: ['org_1/logo/a.png'] },
  knowledgeBaseDocumentIds: ['kbd_1'],
  manualAnswerIds: ['ma_1'],
  integrations: [{ id: 'icn_1', provider: 'google' }],
};

describe('PurgeOrganizationService', () => {
  let service: PurgeOrganizationService;
  let snapshotService: jest.Mocked<PurgeOrganizationSnapshotService>;
  let externalService: jest.Mocked<PurgeOrganizationExternalService>;

  beforeEach(() => {
    jest.clearAllMocks();
    snapshotService = {
      build: jest.fn().mockResolvedValue(sampleSnapshot),
    } as unknown as jest.Mocked<PurgeOrganizationSnapshotService>;
    externalService = {
      cleanupStripe: jest
        .fn()
        .mockResolvedValue({ customerDeleted: true, subscriptionCanceled: true }),
      cleanupVectorStore: jest.fn().mockResolvedValue({
        knowledgeBaseTasksTriggered: 1,
        manualAnswerOrchestratorTriggered: true,
      }),
      cleanupS3: jest.fn().mockResolvedValue({ objectsDeleted: 3 }),
      verifyS3Clean: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<PurgeOrganizationExternalService>;

    for (const model of [
      'apiKey',
      'control',
      'policy',
      'task',
      'auditLog',
      'device',
      'integrationConnection',
      'vendor',
      'risk',
    ]) {
      mockDb[model === 'member' ? 'member' : model].count =
        jest.fn().mockResolvedValue(0);
    }
    mockDb.member.count = jest.fn().mockResolvedValue(0);
    mockDb.member.findFirst = jest
      .fn()
      .mockResolvedValue({ organizationId: 'org_admin_home' });
    mockDb.organization.delete = jest.fn().mockResolvedValue({ id: 'org_1' });
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    service = new PurgeOrganizationService(snapshotService, externalService);
  });

  it('throws BadRequestException when confirm does not match slug', async () => {
    await expect(
      service.purgeOrganization({
        organizationId: 'org_1',
        confirm: 'wrong',
        adminUserId: 'u1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(externalService.cleanupStripe).not.toHaveBeenCalled();
    expect(mockDb.organization.delete).not.toHaveBeenCalled();
  });

  it('orchestrates external cleanup then DB delete then verification', async () => {
    const order: string[] = [];
    externalService.cleanupStripe.mockImplementation(async () => {
      order.push('stripe');
      return { customerDeleted: true, subscriptionCanceled: true };
    });
    externalService.cleanupVectorStore.mockImplementation(async () => {
      order.push('vector');
      return {
        knowledgeBaseTasksTriggered: 1,
        manualAnswerOrchestratorTriggered: true,
      };
    });
    externalService.cleanupS3.mockImplementation(async () => {
      order.push('s3');
      return { objectsDeleted: 3 };
    });
    mockDb.organization.delete.mockImplementation(async () => {
      order.push('db-delete');
      return { id: 'org_1' };
    });
    externalService.verifyS3Clean.mockImplementation(async () => {
      order.push('verify-s3');
      return true;
    });

    const result = await service.purgeOrganization({
      organizationId: 'org_1',
      confirm: 'acme',
      adminUserId: 'u1',
    });

    expect(order).toEqual([
      'stripe',
      'vector',
      's3',
      'db-delete',
      'verify-s3',
    ]);
    expect(result.success).toBe(true);
    expect(result.deletedCounts).toEqual({ policies: 5 });
    expect(result.externalCleanup.stripe.customerDeleted).toBe(true);
    expect(result.externalCleanup.s3.objectsDeleted).toBe(3);
  });

  it('throws when verification finds leftover rows', async () => {
    mockDb.policy.count.mockResolvedValue(5);
    await expect(
      service.purgeOrganization({
        organizationId: 'org_1',
        confirm: 'acme',
        adminUserId: 'u1',
      }),
    ).rejects.toThrow(/verification failed/);
  });

  it('throws when S3 verification reports leftover objects', async () => {
    externalService.verifyS3Clean.mockResolvedValue(false);
    await expect(
      service.purgeOrganization({
        organizationId: 'org_1',
        confirm: 'acme',
        adminUserId: 'u1',
      }),
    ).rejects.toThrow(/S3 objects remain/);
  });

  it('writes persistent audit log to admin member org', async () => {
    await service.purgeOrganization({
      organizationId: 'org_1',
      confirm: 'acme',
      adminUserId: 'u1',
    });

    const calls = mockDb.auditLog.create.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const [arg] of calls) {
      expect(arg.data.organizationId).toBe('org_admin_home');
      expect(arg.data.entityId).toBe('org_1');
    }
  });

  it('wraps raw Stripe/S3/vector errors as InternalServerErrorException', async () => {
    const raw = new Error('STRIPE req_abc123 customer cus_secret leaked');
    externalService.cleanupStripe.mockRejectedValue(raw);

    const promise = service.purgeOrganization({
      organizationId: 'org_1',
      confirm: 'acme',
      adminUserId: 'u1',
    });

    await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException);
    await expect(promise).rejects.not.toThrow(/cus_secret/);
    expect(mockDb.organization.delete).not.toHaveBeenCalled();
  });

  it('succeeds even if completion audit log write fails', async () => {
    mockDb.auditLog.create
      .mockResolvedValueOnce({}) // initiated
      .mockRejectedValueOnce(new Error('db unavailable')); // completed

    const result = await service.purgeOrganization({
      organizationId: 'org_1',
      confirm: 'acme',
      adminUserId: 'u1',
    });

    expect(result.success).toBe(true);
    expect(mockDb.organization.delete).toHaveBeenCalled();
  });

  it('fails closed if the initiated audit log write fails, before deletion', async () => {
    mockDb.auditLog.create.mockRejectedValueOnce(new Error('db unavailable'));

    await expect(
      service.purgeOrganization({
        organizationId: 'org_1',
        confirm: 'acme',
        adminUserId: 'u1',
      }),
    ).rejects.toThrow(/db unavailable/);

    expect(externalService.cleanupStripe).not.toHaveBeenCalled();
    expect(mockDb.organization.delete).not.toHaveBeenCalled();
  });

  it('passes snapshot to verifyS3Clean so non-prefix keys can be verified', async () => {
    await service.purgeOrganization({
      organizationId: 'org_1',
      confirm: 'acme',
      adminUserId: 'u1',
    });

    expect(externalService.verifyS3Clean).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({
        s3KeysByBucket: expect.any(Object),
      }),
    );
  });

  it('fails closed when admin has no other membership for audit trail', async () => {
    mockDb.member.findFirst.mockResolvedValue(null);

    await expect(
      service.purgeOrganization({
        organizationId: 'org_1',
        confirm: 'acme',
        adminUserId: 'u1',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(externalService.cleanupStripe).not.toHaveBeenCalled();
    expect(mockDb.organization.delete).not.toHaveBeenCalled();
  });
});
