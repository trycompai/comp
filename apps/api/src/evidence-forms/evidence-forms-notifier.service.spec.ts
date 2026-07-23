const mockDb = {
  organization: { findUnique: jest.fn() },
  member: { findMany: jest.fn() },
};

jest.mock('@db', () => ({ db: mockDb }));

jest.mock('@trycompai/email', () => ({
  isUserUnsubscribed: jest.fn().mockResolvedValue(false),
  getUnsubscribeUrl: jest
    .fn()
    .mockReturnValue('https://app.trycomp.ai/unsubscribe'),
}));

jest.mock('../email/trigger-email', () => ({
  triggerEmail: jest.fn().mockResolvedValue({ id: 'email_1' }),
}));

jest.mock('../email/templates/evidence-access-request-submitted', () => ({
  EvidenceAccessRequestSubmittedEmail: () => null,
}));

import { isUserUnsubscribed } from '@trycompai/email';
import { triggerEmail } from '../email/trigger-email';
import { EvidenceFormsNotifierService } from './evidence-forms-notifier.service';

describe('EvidenceFormsNotifierService', () => {
  let service: EvidenceFormsNotifierService;

  beforeEach(() => {
    jest.clearAllMocks();
    (isUserUnsubscribed as jest.Mock).mockResolvedValue(false);
    service = new EvidenceFormsNotifierService();
  });

  it('emails every active owner/admin, excluding the submitter', async () => {
    mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme' });
    mockDb.member.findMany.mockResolvedValue([
      {
        role: 'admin',
        user: { id: 'usr_admin', email: 'admin@acme.com', name: 'Admin' },
      },
      {
        role: 'owner',
        user: { id: 'usr_owner', email: 'owner@acme.com', name: 'Owner' },
      },
      {
        role: 'employee',
        user: {
          id: 'usr_submitter',
          email: 'submitter@acme.com',
          name: 'Submitter',
        },
      },
    ]);

    await service.notifyAccessRequestSubmitted({
      organizationId: 'org_1',
      submitterUserId: 'usr_submitter',
      submitterName: 'Submitter',
      submissionId: 'sub_1',
      data: {
        accountsNeeded: 'GitHub',
        permissionsNeeded: 'write',
        reasonForRequest: 'New hire',
      },
    });

    expect(triggerEmail).toHaveBeenCalledTimes(2);
    const recipients = (triggerEmail as jest.Mock).mock.calls.map(
      (call) => call[0].to,
    );
    expect(recipients.sort()).toEqual(['admin@acme.com', 'owner@acme.com']);
    expect(mockDb.member.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', deactivated: false },
      select: {
        role: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
  });

  it('does nothing when there are no owner/admin recipients', async () => {
    mockDb.member.findMany.mockResolvedValue([
      {
        role: 'employee',
        user: {
          id: 'usr_submitter',
          email: 'submitter@acme.com',
          name: 'Submitter',
        },
      },
    ]);

    await service.notifyAccessRequestSubmitted({
      organizationId: 'org_1',
      submitterUserId: 'usr_submitter',
      submitterName: 'Submitter',
      submissionId: 'sub_1',
      data: {},
    });

    expect(triggerEmail).not.toHaveBeenCalled();
    expect(mockDb.organization.findUnique).not.toHaveBeenCalled();
  });

  it('excludes admins who unsubscribed from emails', async () => {
    mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme' });
    mockDb.member.findMany.mockResolvedValue([
      {
        role: 'admin',
        user: { id: 'usr_admin', email: 'admin@acme.com', name: 'Admin' },
      },
      {
        role: 'owner',
        user: { id: 'usr_owner', email: 'owner@acme.com', name: 'Owner' },
      },
    ]);
    (isUserUnsubscribed as jest.Mock).mockImplementation(
      (_db: unknown, email: string) =>
        Promise.resolve(email === 'admin@acme.com'),
    );

    await service.notifyAccessRequestSubmitted({
      organizationId: 'org_1',
      submitterUserId: 'usr_other',
      submitterName: 'Requester',
      submissionId: 'sub_1',
      data: {},
    });

    expect(triggerEmail).toHaveBeenCalledTimes(1);
    expect((triggerEmail as jest.Mock).mock.calls[0][0].to).toBe(
      'owner@acme.com',
    );
  });
});
