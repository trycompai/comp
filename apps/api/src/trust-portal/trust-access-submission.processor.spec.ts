import { processTrustAccessSubmissionPayload } from './trust-access-submission.processor';
import type { TrustAccessSubmission } from './trust-access-submission';

jest.mock('@db', () => ({
  db: {
    trust: { findFirst: jest.fn() },
    trustAccessGrant: { findFirst: jest.fn(), update: jest.fn() },
    trustAccessRequest: { findFirst: jest.fn(), create: jest.fn() },
    member: { findMany: jest.fn() },
  },
}));
jest.mock('@trigger.dev/sdk', () => ({ tasks: { trigger: jest.fn() } }));
jest.mock('./trust-access-url', () => ({
  buildTrustPortalAccessUrl: jest.fn(),
}));

const mockDb = jest.requireMock<{
  db: {
    trust: { findFirst: jest.Mock };
    trustAccessGrant: { findFirst: jest.Mock; update: jest.Mock };
    trustAccessRequest: { findFirst: jest.Mock; create: jest.Mock };
    member: { findMany: jest.Mock };
  };
}>('@db').db;
const mockAccessUrl = jest.requireMock<{
  buildTrustPortalAccessUrl: jest.Mock;
}>('./trust-access-url').buildTrustPortalAccessUrl;
const emailService = {
  sendAccessReclaimEmail: jest.fn(),
  sendAccessRequestNotification: jest.fn(),
};
const requestPayload: TrustAccessSubmission = {
  kind: 'request',
  organizationId: 'org_local',
  email: 'jane@example.com',
  request: { name: 'Jane', purpose: 'Review security' },
};
const pendingRequest = {
  id: 'tar_local',
  name: 'Jane',
  email: 'jane@example.com',
  company: null,
  jobTitle: null,
  purpose: 'Review security',
  requestedDurationDays: null,
};
const future = new Date(Date.now() + 86400000);
const grant = {
  id: 'tag_local',
  subjectEmail: 'Jane@example.com',
  expiresAt: future,
  accessToken: 'secret',
  accessTokenExpiresAt: future,
  accessRequest: { name: 'Jane' },
};
const processSubmission = (payload: TrustAccessSubmission = requestPayload) =>
  processTrustAccessSubmissionPayload({
    payload,
    runId: 'run_local',
    emailService,
  });

describe('Trust access submission background processing', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockDb.trust.findFirst.mockResolvedValue({
      organizationId: 'org_local',
      contactEmail: 'owner@example.com',
      organization: { name: 'Acme' },
    });
    mockDb.trustAccessGrant.findFirst.mockResolvedValue(null);
    mockDb.trustAccessRequest.findFirst.mockResolvedValue(null);
    mockDb.trustAccessRequest.create.mockResolvedValue(pendingRequest);
    mockAccessUrl.mockResolvedValue('https://example.com/access/secret');
  });

  it.each(['deleted', 'unpublished'])(
    'does no grant lookup or writes if portal becomes %s',
    async () => {
      mockDb.trust.findFirst.mockResolvedValue(null);
      await processSubmission();
      expect(mockDb.trust.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org_local', status: 'published' },
        }),
      );
      expect(mockDb.trustAccessGrant.findFirst).not.toHaveBeenCalled();
      expect(mockDb.trustAccessRequest.create).not.toHaveBeenCalled();
      expect(mockAccessUrl).not.toHaveBeenCalled();
    },
  );

  it('sends an existing grant link only to the stored grant recipient', async () => {
    mockDb.trustAccessGrant.findFirst.mockResolvedValue(grant);
    await expect(processSubmission()).resolves.toBeUndefined();
    expect(mockDb.trustAccessGrant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          subjectEmail: { equals: 'jane@example.com', mode: 'insensitive' },
          accessRequest: { organizationId: 'org_local' },
        }),
      }),
    );
    expect(emailService.sendAccessReclaimEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'Jane@example.com',
        accessLink: 'https://example.com/access/secret',
        idempotencyKey: 'trust-access-email:run_local',
      }),
    );
    expect(mockDb.trustAccessRequest.create).not.toHaveBeenCalled();
  });

  it('rotates an expired token to the grant expiry and preserves it on retry', async () => {
    mockDb.trustAccessGrant.findFirst.mockResolvedValueOnce({
      ...grant,
      accessTokenExpiresAt: new Date(0),
    });
    emailService.sendAccessReclaimEmail.mockRejectedValueOnce(
      new Error('enqueue failed'),
    );
    await expect(processSubmission()).rejects.toThrow('enqueue failed');
    const update: unknown = mockDb.trustAccessGrant.update.mock.calls[0][0];
    expect(update).toEqual({
      where: { id: 'tag_local' },
      data: {
        accessToken: expect.any(String),
        accessTokenExpiresAt: future,
      },
    });
    if (
      typeof update !== 'object' ||
      !update ||
      !('data' in update) ||
      typeof update.data !== 'object' ||
      !update.data ||
      !('accessToken' in update.data)
    ) {
      throw new Error('Missing token update');
    }
    mockDb.trustAccessGrant.findFirst.mockResolvedValue({
      ...grant,
      accessToken: update.data.accessToken,
    });
    await processSubmission();
    expect(mockDb.trustAccessGrant.update).toHaveBeenCalledTimes(1);
    expect(emailService.sendAccessReclaimEmail.mock.calls[1][0]).toHaveProperty(
      'idempotencyKey',
      'trust-access-email:run_local',
    );
  });

  it('reclaim with no grant does not create a request or send email', async () => {
    await processSubmission({
      kind: 'reclaim',
      organizationId: 'org_local',
      email: 'jane@example.com',
    });
    expect(mockDb.trustAccessRequest.findFirst).not.toHaveBeenCalled();
    expect(mockDb.trustAccessRequest.create).not.toHaveBeenCalled();
    expect(emailService.sendAccessReclaimEmail).not.toHaveBeenCalled();
  });

  it('forwards reclaim query to the URL builder', async () => {
    mockDb.trustAccessGrant.findFirst.mockResolvedValue(grant);
    await processSubmission({
      kind: 'reclaim',
      organizationId: 'org_local',
      email: 'jane@example.com',
      query: 'security-questionnaire',
    });
    expect(mockAccessUrl).toHaveBeenCalledWith({
      organizationId: 'org_local',
      accessToken: 'secret',
      query: 'security-questionnaire',
    });
  });

  it('creates a scoped request and notifies the configured recipient', async () => {
    await processSubmission();
    expect(mockDb.trustAccessRequest.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org_local',
        name: 'Jane',
        email: 'jane@example.com',
        purpose: 'Review security',
        status: 'under_review',
        ipAddress: undefined,
        userAgent: undefined,
      },
    });
    expect(emailService.sendAccessRequestNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'owner@example.com',
        requesterEmail: 'jane@example.com',
        reviewUrl: `${process.env.BETTER_AUTH_URL}/org_local/trust/access-requests`,
        idempotencyKey: expect.stringMatching(
          /^trust-request-notification:tar_local:/,
        ),
      }),
    );
  });

  it('retries failed notice after creation using the same pending row and email deduplication key', async () => {
    emailService.sendAccessRequestNotification.mockRejectedValueOnce(
      new Error('enqueue failed'),
    );
    await expect(processSubmission()).rejects.toThrow('enqueue failed');
    mockDb.trustAccessRequest.findFirst.mockResolvedValue(pendingRequest);
    await processSubmission();
    expect(mockDb.trustAccessRequest.create).toHaveBeenCalledTimes(1);
    expect(emailService.sendAccessRequestNotification.mock.calls[1][0]).toEqual(
      emailService.sendAccessRequestNotification.mock.calls[0][0],
    );
  });

  it('uses the pending requester details rather than overwriting them with an anonymous retry', async () => {
    mockDb.trustAccessRequest.findFirst.mockResolvedValue({
      ...pendingRequest,
      name: 'Original requester',
    });
    await processSubmission();
    expect(mockDb.trustAccessRequest.create).not.toHaveBeenCalled();
    expect(emailService.sendAccessRequestNotification).toHaveBeenCalledWith(
      expect.objectContaining({ requesterName: 'Original requester' }),
    );
  });

  it('notifies only active owner/admin members, parsing complete role names', async () => {
    mockDb.trust.findFirst.mockResolvedValue({
      organizationId: 'org_local',
      contactEmail: null,
      organization: { name: 'Acme' },
    });
    mockDb.member.findMany.mockResolvedValue([
      { role: 'employee,admin', user: { email: 'admin@example.com' } },
      { role: 'owner', user: { email: 'admin@example.com' } },
      {
        role: 'custom-admin-assistant',
        user: { email: 'employee@example.com' },
      },
    ]);
    await processSubmission();
    expect(mockDb.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org_local',
          isActive: true,
          deactivated: false,
        },
      }),
    );
    expect(emailService.sendAccessRequestNotification).toHaveBeenCalledTimes(1);
    expect(emailService.sendAccessRequestNotification).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: 'admin@example.com' }),
    );
  });
});
