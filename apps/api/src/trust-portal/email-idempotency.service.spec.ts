import { TrustEmailService } from './email.service';

jest.mock('../email/trigger-email', () => ({
  triggerEmail: jest.fn().mockResolvedValue({ id: 'run_local' }),
}));
const mockTriggerEmail = jest.requireMock<{ triggerEmail: jest.Mock }>(
  '../email/trigger-email',
).triggerEmail;

describe('Trust access email task deduplication', () => {
  beforeEach(() => {
    mockTriggerEmail.mockClear();
  });

  it('passes the grant email retry key to the shared durable email task', async () => {
    await new TrustEmailService().sendAccessReclaimEmail({
      toEmail: 'jane@example.com',
      toName: 'Jane',
      organizationName: 'Acme',
      accessLink: 'https://example.com/access/secret',
      expiresAt: new Date(),
      idempotencyKey: 'trust-access-email:run_local',
    });
    expect(mockTriggerEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        trustPortal: true,
        idempotencyKey: 'trust-access-email:run_local',
      }),
    );
  });

  it('passes the stable pending-request notification key to the email task', async () => {
    await new TrustEmailService().sendAccessRequestNotification({
      toEmail: 'owner@example.com',
      organizationName: 'Acme',
      requesterName: 'Jane',
      requesterEmail: 'jane@example.com',
      reviewUrl: 'https://example.com/requests',
      idempotencyKey: 'trust-request-notification:tar_local:recipient',
    });
    expect(mockTriggerEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'trust-request-notification:tar_local:recipient',
      }),
    );
  });
});
