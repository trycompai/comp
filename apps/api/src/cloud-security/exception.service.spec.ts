import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock @db so the Prisma client doesn't try to connect at import time, and
// so we can assert on what `markAsException` writes.
const dbMock = {
  integrationCheckResult: { findFirst: jest.fn() },
  findingException: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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

  it('creates a new exception when none exists for this finding', async () => {
    withFinding({
      findingKey: 'iam-no-mfa-john',
      resourceId: 'john',
      connectionId: 'icn_aws',
    });
    dbMock.findingException.findFirst.mockResolvedValueOnce(null);
    dbMock.findingException.create.mockResolvedValueOnce({ id: 'fex_new' });

    const result = await buildService().markAsException({
      findingId: 'icx_1',
      organizationId: 'org_1',
      userId: 'usr_1',
      reason: 'Public marketing bucket — intentional. Bucket policy locked.',
    });

    expect(result.id).toBe('fex_new');
    expect(dbMock.findingException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org_1',
          connectionId: 'icn_aws',
          checkId: 'iam-no-mfa', // normalized from finding key
          resourceId: 'john',
          markedById: 'usr_1',
        }),
      }),
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exception_marked' }),
    );
  });

  it('updates an existing active exception instead of creating a duplicate', async () => {
    withFinding({
      findingKey: 'iam-no-mfa-alice',
      resourceId: 'alice',
      connectionId: 'icn_aws',
    });
    dbMock.findingException.findFirst.mockResolvedValueOnce({ id: 'fex_old' });
    dbMock.findingException.update.mockResolvedValueOnce({ id: 'fex_old' });

    const result = await buildService().markAsException({
      findingId: 'icx_2',
      organizationId: 'org_1',
      userId: 'usr_1',
      reason: 'Updated reason now exceeds the twenty char minimum length.',
    });

    expect(result.id).toBe('fex_old');
    expect(dbMock.findingException.update).toHaveBeenCalled();
    expect(dbMock.findingException.create).not.toHaveBeenCalled();
  });

  it('rejects findings that lack a stable check/resource identity', async () => {
    dbMock.integrationCheckResult.findFirst.mockResolvedValueOnce({
      resourceId: null,
      evidence: null,
      checkRun: { connectionId: 'icn_aws' },
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

    await buildService().revokeException({
      exceptionId: 'fex_1',
      organizationId: 'org_1',
      userId: 'usr_1',
    });

    expect(dbMock.findingException.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revokedById: 'usr_1' }),
      }),
    );
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
