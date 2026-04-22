import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FrameworkRollbackService } from './framework-rollback.service';

jest.mock('@db', () => ({
  db: {
    frameworkSyncOperation: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    frameworkInstance: { findUnique: jest.fn(), update: jest.fn() },
    task: { findMany: jest.fn().mockResolvedValue([]) },
    policy: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((fn: any) => fn({
      control: { update: jest.fn(), deleteMany: jest.fn() },
      task: { update: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      policy: { update: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      policyVersion: { delete: jest.fn() },
      requirementMap: { update: jest.fn(), deleteMany: jest.fn() },
      frameworkSyncOperation: { create: jest.fn().mockResolvedValue({ id: 'fso_rb' }), update: jest.fn() },
      frameworkInstance: { update: jest.fn() },
      $executeRawUnsafe: jest.fn(),
    })),
  },
}));
import { db } from '@db';

describe('FrameworkRollbackService', () => {
  let service: FrameworkRollbackService;
  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({ providers: [FrameworkRollbackService] }).compile();
    service = mod.get(FrameworkRollbackService);
  });

  it('404s when the sync operation does not exist', async () => {
    (db.frameworkSyncOperation.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.rollback({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', syncOperationId: 'fso_missing', memberId: 'mem_1' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('403s when sync op belongs to another org', async () => {
    (db.frameworkSyncOperation.findUnique as jest.Mock).mockResolvedValue({ id: 'fso_1', frameworkInstance: { organizationId: 'org_other' } });
    await expect(service.rollback({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', syncOperationId: 'fso_1', memberId: 'mem_1' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('400s when rollback window has expired', async () => {
    (db.frameworkSyncOperation.findUnique as jest.Mock).mockResolvedValue({
      id: 'fso_1', kind: 'SYNC', frameworkInstanceId: 'frm_1',
      frameworkInstance: { organizationId: 'org_1', id: 'frm_1' },
      rollbackExpiresAt: new Date(Date.now() - 1000),
      rolledBackByOperationId: null,
    });
    await expect(service.rollback({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', syncOperationId: 'fso_1', memberId: 'mem_1' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('400s when sync op has already been rolled back', async () => {
    (db.frameworkSyncOperation.findUnique as jest.Mock).mockResolvedValue({
      id: 'fso_1', kind: 'SYNC', frameworkInstanceId: 'frm_1',
      frameworkInstance: { organizationId: 'org_1', id: 'frm_1' },
      rollbackExpiresAt: new Date(Date.now() + 86_400_000),
      rolledBackByOperationId: 'fso_previous_rb',
    });
    await expect(service.rollback({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', syncOperationId: 'fso_1', memberId: 'mem_1' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('400s when a task created by the sync has been completed since', async () => {
    (db.frameworkSyncOperation.findUnique as jest.Mock).mockResolvedValue({
      id: 'fso_1', kind: 'SYNC', frameworkInstanceId: 'frm_1',
      frameworkInstance: { organizationId: 'org_1', id: 'frm_1' },
      fromVersionId: 'fvr_v1', toVersionId: 'fvr_v2',
      rollbackExpiresAt: new Date(Date.now() + 86_400_000),
      rolledBackByOperationId: null,
      undoPayload: { controls: { created: [], archived: [], contentUpdated: [] }, tasks: { created: ['tsk_new'], archived: [], contentUpdated: [] }, policies: { created: [], archived: [], contentUpdated: [], draftsAdded: [] }, requirementMaps: { created: [], archived: [] }, controlDocumentTypes: { created: [], archived: [] } },
    });
    (db.task.findMany as jest.Mock).mockResolvedValue([{ id: 'tsk_new', completedAt: new Date() }]);

    await expect(service.rollback({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', syncOperationId: 'fso_1', memberId: 'mem_1' }))
      .rejects.toThrow(/data loss|completed/i);
  });

  it('400s when a policy created by the sync has been published since', async () => {
    (db.frameworkSyncOperation.findUnique as jest.Mock).mockResolvedValue({
      id: 'fso_1', kind: 'SYNC', frameworkInstanceId: 'frm_1',
      frameworkInstance: { organizationId: 'org_1', id: 'frm_1' },
      fromVersionId: 'fvr_v1', toVersionId: 'fvr_v2',
      rollbackExpiresAt: new Date(Date.now() + 86_400_000),
      rolledBackByOperationId: null,
      undoPayload: { controls: { created: [], archived: [], contentUpdated: [] }, tasks: { created: [], archived: [], contentUpdated: [] }, policies: { created: ['pol_new'], archived: [], contentUpdated: [], draftsAdded: [] }, requirementMaps: { created: [], archived: [] }, controlDocumentTypes: { created: [], archived: [] } },
    });
    (db.policy.findMany as jest.Mock).mockResolvedValue([{ id: 'pol_new', status: 'published' }]);

    await expect(service.rollback({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', syncOperationId: 'fso_1', memberId: 'mem_1' }))
      .rejects.toThrow(/data loss|published/i);
  });
});
