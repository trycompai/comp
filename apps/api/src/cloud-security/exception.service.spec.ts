import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock @db so the Prisma client doesn't try to connect at import time, and
// so we can assert on what `markAsException` writes.
const dbMock = {
  integrationCheckResult: { findFirst: jest.fn() },
  findingException: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  auditLog: { create: jest.fn() },
};

jest.mock('@db', () => ({ db: dbMock }));

// Mock the audit logger so we can assert on it without exercising the real
// DB call inside.
const auditLogMock = jest.fn().mockResolvedValue(undefined);
jest.mock('./cloud-security-audit', () => ({
  logCloudSecurityActivity: auditLogMock,
}));

import { CloudExceptionService } from './exception.service';

function buildService() {
  return new CloudExceptionService();
}

function withFinding(opts: {
  findingKey: string;
  resourceId: string;
  connectionId: string;
}) {
  dbMock.integrationCheckResult.findFirst.mockResolvedValueOnce({
    resourceId: opts.resourceId,
    evidence: { findingKey: opts.findingKey },
    checkRun: { connectionId: opts.connectionId },
  });
}

describe('CloudExceptionService.markAsException', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbMock.findingException.findFirst.mockReset();
    dbMock.findingException.create.mockReset();
    dbMock.findingException.update.mockReset();
    dbMock.findingException.upsert.mockReset();
  });

  it('rejects reasons shorter than 20 characters', async () => {
    await expect(
      buildService().markAsException({
        findingId: 'icx_x',
        organizationId: 'org_1',
        userId: 'usr_1',
        reason: 'too short',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects past expiration dates', async () => {
    await expect(
      buildService().markAsException({
        findingId: 'icx_x',
        organizationId: 'org_1',
        userId: 'usr_1',
        reason: 'A perfectly normal documented reason for exception.',
        expiresAt: new Date(Date.now() - 1000),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('upserts atomically — the unique constraint prevents concurrent duplicates', async () => {
    withFinding({
      findingKey: 'iam-no-mfa-john',
      resourceId: 'john',
      connectionId: 'icn_aws',
    });
    dbMock.findingException.upsert.mockResolvedValueOnce({ id: 'fex_new' });

    const result = await buildService().markAsException({
      findingId: 'icx_1',
      organizationId: 'org_1',
      userId: 'usr_1',
      reason: 'Public marketing bucket — intentional. Bucket policy locked.',
    });

    expect(result.id).toBe('fex_new');
    expect(dbMock.findingException.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_connectionId_checkId_resourceId: {
            organizationId: 'org_1',
            connectionId: 'icn_aws',
            checkId: 'iam-no-mfa', // normalized from finding key
            resourceId: 'john',
          },
        },
      }),
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exception_marked' }),
    );
  });

  it('upsert update branch clears prior revocation and refreshes markedById/At', async () => {
    withFinding({
      findingKey: 'iam-no-mfa-alice',
      resourceId: 'alice',
      connectionId: 'icn_aws',
    });
    dbMock.findingException.upsert.mockResolvedValueOnce({ id: 'fex_old' });

    await buildService().markAsException({
      findingId: 'icx_2',
      organizationId: 'org_1',
      userId: 'usr_2',
      reason: 'Updated reason now exceeds the twenty char minimum length.',
    });

    const call = dbMock.findingException.upsert.mock.calls[0][0];
    expect(call.update).toEqual(
      expect.objectContaining({
        revokedAt: null,
        revokedById: null,
        markedById: 'usr_2',
      }),
    );
  });

  it('prepends callerLabel to audit description when set (API key / service token attribution)', async () => {
    // When the userId came from ActingUserResolver's owner-fallback path,
    // the controller forwards a callerLabel so the audit log makes it
    // clear this was automation, not a UI click.
    withFinding({
      findingKey: 'iam-no-mfa-john',
      resourceId: 'john',
      connectionId: 'icn_aws',
    });
    dbMock.findingException.upsert.mockResolvedValueOnce({ id: 'fex_new' });

    await buildService().markAsException({
      findingId: 'icx_1',
      organizationId: 'org_1',
      userId: 'usr_owner',
      reason: 'CI pipeline marking this finding under approved exception policy.',
      callerLabel: 'via API key "CI Pipeline"',
    });

    const auditCall = auditLogMock.mock.calls[0][0];
    expect(auditCall.description).toMatch(
      /^\[via API key "CI Pipeline"\] Marked finding /,
    );
    expect(auditCall.metadata).toEqual(
      expect.objectContaining({ callerLabel: 'via API key "CI Pipeline"' }),
    );
  });

  it('omits the [callerLabel] prefix when callerLabel is not provided (session calls)', async () => {
    withFinding({
      findingKey: 'iam-no-mfa-john',
      resourceId: 'john',
      connectionId: 'icn_aws',
    });
    dbMock.findingException.upsert.mockResolvedValueOnce({ id: 'fex_new' });

    await buildService().markAsException({
      findingId: 'icx_1',
      organizationId: 'org_1',
      userId: 'usr_human',
      reason: 'Documented exception with sufficient supporting rationale here.',
      // no callerLabel — this is a session call
    });

    const auditCall = auditLogMock.mock.calls[0][0];
    // No bracket prefix — description begins directly with "Marked finding"
    expect(auditCall.description).toMatch(/^Marked finding /);
    expect(auditCall.metadata.callerLabel).toBeNull();
  });

  it('rejects findings that lack a stable check/resource identity', async () => {
    dbMock.integrationCheckResult.findFirst.mockResolvedValueOnce({
      resourceId: null,
      evidence: null,
      checkRun: { connectionId: 'icn_aws', checkId: 'all' },
    });
    await expect(
      buildService().markAsException({
        findingId: 'icx_x',
        organizationId: 'org_1',
        userId: 'usr_1',
        reason: 'A perfectly long, well-documented reason here for tests.',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('falls back to the run checkId for older rows that have no findingKey', async () => {
    // AWS integration-platform finding stored before findingKey stamping: the
    // evidence has no findingKey, but a task-scoped run carries the real check
    // id, which IS the normalized check id used to key the exception.
    dbMock.integrationCheckResult.findFirst.mockResolvedValueOnce({
      resourceId: 'primer-production-reports-bucket',
      evidence: { bucket: 'primer-production-reports-bucket' },
      checkRun: { connectionId: 'icn_aws', checkId: 'aws-s3-public-access' },
    });
    dbMock.findingException.upsert.mockResolvedValueOnce({ id: 'fex_fb' });

    const result = await buildService().markAsException({
      findingId: 'icx_old',
      organizationId: 'org_1',
      userId: 'usr_1',
      reason: 'Bucket intentionally public for marketing assets — reviewed.',
    });

    expect(result.id).toBe('fex_fb');
    expect(dbMock.findingException.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_connectionId_checkId_resourceId: {
            organizationId: 'org_1',
            connectionId: 'icn_aws',
            checkId: 'aws-s3-public-access',
            resourceId: 'primer-production-reports-bucket',
          },
        },
      }),
    );
  });

  it("rejects older rows whose run checkId is the 'all' auto-run sentinel", async () => {
    dbMock.integrationCheckResult.findFirst.mockResolvedValueOnce({
      resourceId: 'some-bucket',
      evidence: { bucket: 'some-bucket' },
      checkRun: { connectionId: 'icn_aws', checkId: 'all' },
    });
    await expect(
      buildService().markAsException({
        findingId: 'icx_all',
        organizationId: 'org_1',
        userId: 'usr_1',
        reason: 'A perfectly long, well-documented reason here for tests.',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('stamped findingKey (new rows) normalizes to the bare check id', async () => {
    // Mirrors what AWS emitOutcomes now writes: findingKey = `${checkId}-${resourceId}`.
    withFinding({
      findingKey: 'aws-s3-public-access-primer-production-reports-bucket',
      resourceId: 'primer-production-reports-bucket',
      connectionId: 'icn_aws',
    });
    dbMock.findingException.upsert.mockResolvedValueOnce({ id: 'fex_new2' });

    await buildService().markAsException({
      findingId: 'icx_new',
      organizationId: 'org_1',
      userId: 'usr_1',
      reason: 'Bucket intentionally public for marketing assets — reviewed.',
    });

    const call = dbMock.findingException.upsert.mock.calls[0][0];
    expect(
      call.where.organizationId_connectionId_checkId_resourceId.checkId,
    ).toBe('aws-s3-public-access');
  });
});

describe('CloudExceptionService.revokeException', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbMock.findingException.findFirst.mockReset();
    dbMock.findingException.update.mockReset();
  });

  it('throws NotFoundException when the exception does not exist', async () => {
    dbMock.findingException.findFirst.mockResolvedValueOnce(null);
    await expect(
      buildService().revokeException({
        exceptionId: 'fex_missing',
        organizationId: 'org_1',
        userId: 'usr_1',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('refuses to revoke an already-revoked exception', async () => {
    dbMock.findingException.findFirst.mockResolvedValueOnce({
      id: 'fex_1',
      connectionId: 'icn_aws',
      checkId: 'iam-no-mfa',
      resourceId: 'john',
      revokedAt: new Date(),
    });
    await expect(
      buildService().revokeException({
        exceptionId: 'fex_1',
        organizationId: 'org_1',
        userId: 'usr_1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('writes revokedAt + revokedById and an audit log entry on success', async () => {
    dbMock.findingException.findFirst.mockResolvedValueOnce({
      id: 'fex_1',
      connectionId: 'icn_aws',
      checkId: 'iam-no-mfa',
      resourceId: 'john',
      revokedAt: null,
    });
    dbMock.findingException.update.mockResolvedValueOnce({ id: 'fex_1' });

    const before = Date.now();
    await buildService().revokeException({
      exceptionId: 'fex_1',
      organizationId: 'org_1',
      userId: 'usr_1',
    });
    const after = Date.now();

    expect(dbMock.findingException.update).toHaveBeenCalled();
    const call = dbMock.findingException.update.mock.calls[0][0];
    expect(call.data.revokedById).toBe('usr_1');
    // revokedAt must be a Date set during this call window.
    expect(call.data.revokedAt).toBeInstanceOf(Date);
    expect(call.data.revokedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(call.data.revokedAt.getTime()).toBeLessThanOrEqual(after);
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exception_revoked' }),
    );
  });
});

describe('CloudExceptionService.isExceptionActive', () => {
  beforeEach(() => {
    dbMock.findingException.findFirst.mockReset();
  });

  it('returns true when a non-revoked, non-expired exception exists', async () => {
    dbMock.findingException.findFirst.mockResolvedValueOnce({ id: 'fex_1' });
    const active = await buildService().isExceptionActive({
      organizationId: 'org_1',
      connectionId: 'icn_aws',
      checkId: 'iam-no-mfa',
      resourceId: 'john',
    });
    expect(active).toBe(true);
  });

  it('returns false when none match', async () => {
    dbMock.findingException.findFirst.mockResolvedValueOnce(null);
    const active = await buildService().isExceptionActive({
      organizationId: 'org_1',
      connectionId: 'icn_aws',
      checkId: 'iam-no-mfa',
      resourceId: 'john',
    });
    expect(active).toBe(false);
  });
});
