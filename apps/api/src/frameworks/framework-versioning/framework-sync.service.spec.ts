import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FrameworkSyncService } from './framework-sync.service';

jest.mock('@db', () => ({
  db: {
    frameworkInstance: { findUnique: jest.fn() },
    frameworkVersion: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));
import { db } from '@db';

describe('FrameworkSyncService preconditions', () => {
  let service: FrameworkSyncService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({ providers: [FrameworkSyncService] }).compile();
    service = mod.get(FrameworkSyncService);
  });

  it('404s when framework instance not found', async () => {
    (db.frameworkInstance.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.sync({ organizationId: 'org_1', frameworkInstanceId: 'frm_missing', targetVersionId: 'fvr_1', memberId: 'mem_1' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('403s when instance belongs to a different org', async () => {
    (db.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({ id: 'frm_1', organizationId: 'org_other' });
    await expect(service.sync({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', targetVersionId: 'fvr_1', memberId: 'mem_1' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('400s when target version belongs to a different framework', async () => {
    (db.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({ id: 'frm_1', organizationId: 'org_1', frameworkId: 'frk_soc2', currentVersionId: 'fvr_current' });
    (db.frameworkVersion.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'fvr_current', frameworkId: 'frk_soc2' })
      .mockResolvedValueOnce({ id: 'fvr_target', frameworkId: 'frk_iso' });
    await expect(service.sync({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', targetVersionId: 'fvr_target', memberId: 'mem_1' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('is a no-op when instance is already at target version', async () => {
    (db.frameworkInstance.findUnique as jest.Mock).mockResolvedValue({ id: 'frm_1', organizationId: 'org_1', frameworkId: 'frk_soc2', currentVersionId: 'fvr_target' });
    const result = await service.sync({ organizationId: 'org_1', frameworkInstanceId: 'frm_1', targetVersionId: 'fvr_target', memberId: 'mem_1' });
    expect(result.kind).toBe('no-op');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
