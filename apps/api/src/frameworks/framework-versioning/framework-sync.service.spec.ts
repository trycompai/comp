import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FrameworkSyncService } from './framework-sync.service';

jest.mock('@db', () => {
  const tx = {
    frameworkInstance: { findUnique: jest.fn() },
    frameworkVersion: { findUnique: jest.fn(), findFirst: jest.fn() },
  };
  return {
    db: {
      frameworkInstance: { findUnique: jest.fn() },
      frameworkVersion: { findUnique: jest.fn(), findFirst: jest.fn() },
      $transaction: jest.fn((cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
      __tx: tx,
    },
  };
});

jest.mock('./org-advisory-lock', () => ({
  lockOrganizationForSync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./framework-sync-apply', () => ({
  applySync: jest.fn(),
}));

import { db } from '@db';
import { applySync } from './framework-sync-apply';
const tx = (
  db as unknown as {
    __tx: {
      frameworkInstance: { findUnique: jest.Mock };
      frameworkVersion: { findUnique: jest.Mock; findFirst: jest.Mock };
    };
  }
).__tx;

describe('FrameworkSyncService preconditions', () => {
  let service: FrameworkSyncService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({ providers: [FrameworkSyncService] }).compile();
    service = mod.get(FrameworkSyncService);
  });

  it('404s when framework instance not found (pre-lock)', async () => {
    (db.frameworkInstance.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.sync({ organizationId: 'org_1', frameworkInstanceId: 'frm_missing', targetVersionId: 'fvr_1', memberId: 'mem_1' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('403s when instance belongs to a different org (pre-lock)', async () => {
    (db.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({ id: 'frm_1', organizationId: 'org_other', currentVersionId: 'fvr_1' });
    await expect(service.sync({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', targetVersionId: 'fvr_1', memberId: 'mem_1' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('400s when target version belongs to a different framework (inside lock)', async () => {
    (db.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({ id: 'frm_1', organizationId: 'org_1', frameworkId: 'frk_soc2', currentVersionId: 'fvr_current' });
    tx.frameworkInstance.findUnique.mockResolvedValue({ id: 'frm_1', organizationId: 'org_1', frameworkId: 'frk_soc2', currentVersionId: 'fvr_current' });
    tx.frameworkVersion.findUnique
      .mockResolvedValueOnce({ id: 'fvr_current', frameworkId: 'frk_soc2' })
      .mockResolvedValueOnce({ id: 'fvr_target', frameworkId: 'frk_iso' });
    await expect(service.sync({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', targetVersionId: 'fvr_target', memberId: 'mem_1' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('is a no-op when instance is already at target version (pre-lock short-circuit)', async () => {
    (db.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({ id: 'frm_1', organizationId: 'org_1', frameworkId: 'frk_soc2', currentVersionId: 'fvr_target' });
    const result = await service.sync({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', targetVersionId: 'fvr_target', memberId: 'mem_1' });
    expect(result.kind).toBe('no-op');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe('FrameworkSyncService unpinned instances (FRAME-2)', () => {
  let service: FrameworkSyncService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({ providers: [FrameworkSyncService] }).compile();
    service = mod.get(FrameworkSyncService);
  });

  it('diffs from the earliest published version when the instance has no current version', async () => {
    const unpinned = { id: 'frm_1', organizationId: 'org_1', frameworkId: 'frk_soc2', currentVersionId: null };
    (db.frameworkInstance.findUnique as jest.Mock).mockResolvedValue(unpinned);
    tx.frameworkInstance.findUnique.mockResolvedValue(unpinned);
    tx.frameworkVersion.findUnique.mockResolvedValue({ id: 'fvr_target', frameworkId: 'frk_soc2' });
    tx.frameworkVersion.findFirst.mockResolvedValue({ id: 'fvr_earliest', frameworkId: 'frk_soc2' });
    (applySync as jest.Mock).mockResolvedValue({ syncOperationId: 'sync_1' });

    const result = await service.sync({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', targetVersionId: 'fvr_target', memberId: 'mem_1' });

    // Falls back to the earliest version as the "from" instead of throwing.
    expect(tx.frameworkVersion.findFirst).toHaveBeenCalled();
    expect(applySync).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        currentVersion: expect.objectContaining({ id: 'fvr_earliest' }),
        targetVersion: expect.objectContaining({ id: 'fvr_target' }),
      }),
    );
    expect(result.kind).toBe('synced');
  });

  it('400s when an unpinned instance’s framework has no published version to diff from', async () => {
    const unpinned = { id: 'frm_1', organizationId: 'org_1', frameworkId: 'frk_soc2', currentVersionId: null };
    (db.frameworkInstance.findUnique as jest.Mock).mockResolvedValue(unpinned);
    tx.frameworkInstance.findUnique.mockResolvedValue(unpinned);
    tx.frameworkVersion.findUnique.mockResolvedValue({ id: 'fvr_target', frameworkId: 'frk_soc2' });
    tx.frameworkVersion.findFirst.mockResolvedValue(null);

    await expect(service.sync({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', targetVersionId: 'fvr_target', memberId: 'mem_1' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(applySync).not.toHaveBeenCalled();
  });
});
