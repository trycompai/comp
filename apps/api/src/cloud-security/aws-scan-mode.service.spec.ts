import { BadRequestException, ForbiddenException } from '@nestjs/common';

// Mock @db before importing the service so the Prisma client doesn't try
// to connect at import time in this unit-test env.
const mockDb = {
  integrationConnection: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};
jest.mock('@db', () => ({ db: mockDb }));

// Mock the activity logger so we can assert on the description it receives.
const mockAuditLog = jest.fn().mockResolvedValue(undefined);
jest.mock('./cloud-security-audit', () => ({
  logCloudSecurityActivity: mockAuditLog,
}));

import { CloudAwsScanModeService } from './aws-scan-mode.service';

function buildService() {
  return new CloudAwsScanModeService();
}

function withAwsConnection(opts: { currentMode?: string } = {}) {
  mockDb.integrationConnection.findFirst.mockResolvedValueOnce({
    id: 'icn_aws',
    metadata: opts.currentMode ? { awsScanMode: opts.currentMode } : {},
    provider: { slug: 'aws' },
  });
}

describe('CloudAwsScanModeService.updateMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 when the connection does not exist / belongs to a different org', async () => {
    mockDb.integrationConnection.findFirst.mockResolvedValueOnce(null);

    await expect(
      buildService().updateMode({
        connectionId: 'icn_missing',
        organizationId: 'org_1',
        userId: 'usr_1',
        mode: 'security_hub',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns 400 when the connection is not AWS', async () => {
    mockDb.integrationConnection.findFirst.mockResolvedValueOnce({
      id: 'icn_gcp',
      metadata: {},
      provider: { slug: 'gcp' },
    });

    await expect(
      buildService().updateMode({
        connectionId: 'icn_gcp',
        organizationId: 'org_1',
        userId: 'usr_1',
        mode: 'security_hub',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('is idempotent when the target mode equals the current mode', async () => {
    withAwsConnection({ currentMode: 'security_hub' });

    const result = await buildService().updateMode({
      connectionId: 'icn_aws',
      organizationId: 'org_1',
      userId: 'usr_1',
      mode: 'security_hub',
    });

    expect(result).toEqual({ mode: 'security_hub' });
    expect(mockDb.integrationConnection.update).not.toHaveBeenCalled();
    expect(mockAuditLog).not.toHaveBeenCalled();
  });

  it('writes the new mode + audit log on a successful switch (session call)', async () => {
    withAwsConnection({ currentMode: 'comp_scanners' });

    await buildService().updateMode({
      connectionId: 'icn_aws',
      organizationId: 'org_1',
      userId: 'usr_human',
      mode: 'security_hub',
    });

    expect(mockDb.integrationConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'icn_aws' },
        data: expect.objectContaining({
          metadata: expect.objectContaining({ awsScanMode: 'security_hub' }),
        }),
      }),
    );
    const auditCall = mockAuditLog.mock.calls[0][0];
    expect(auditCall.action).toBe('scan_mode_changed');
    // No bracket prefix when callerLabel is undefined (session call).
    expect(auditCall.description).toMatch(/^Switched AWS scan engine: /);
    expect(auditCall.metadata.callerLabel).toBeNull();
  });

  it('prepends callerLabel to the audit description when set (API key call)', async () => {
    // Regression guard for the fix: when an API key triggers this mutation
    // via ActingUserResolver's owner-fallback, the audit description must
    // make the automation source visible — auditors otherwise see only the
    // org owner's name and have no idea it was an automated change.
    withAwsConnection({ currentMode: 'comp_scanners' });

    await buildService().updateMode({
      connectionId: 'icn_aws',
      organizationId: 'org_1',
      userId: 'usr_owner',
      mode: 'security_hub',
      callerLabel: 'via API key "CI Pipeline"',
    });

    const auditCall = mockAuditLog.mock.calls[0][0];
    expect(auditCall.description).toMatch(
      /^\[via API key "CI Pipeline"\] Switched AWS scan engine: /,
    );
    expect(auditCall.metadata).toEqual(
      expect.objectContaining({ callerLabel: 'via API key "CI Pipeline"' }),
    );
  });
});
