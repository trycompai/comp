import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@db/server', () => ({
  db: {
    organization: { findMany: vi.fn() },
  },
}));

vi.mock('./policy-acknowledgment-digest-helpers', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./policy-acknowledgment-digest-helpers')>();
  return {
    ...mod,
    filterDigestMembersByCompliance: vi.fn().mockImplementation(async (_db: unknown, members: unknown[]) => members),
  };
});

vi.mock('@react-email/render', () => ({
  render: vi.fn().mockResolvedValue('<html>mock</html>'),
}));

vi.mock('../../lib/send-email-via-api', () => ({
  sendBatchEmailViaApi: vi.fn(),
}));

vi.mock('@trycompai/email/lib/check-unsubscribe', () => ({
  getUnsubscribedEmails: vi.fn(),
}));

vi.mock('@trigger.dev/sdk', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  schedules: {
    task: (config: { run: (payload: unknown) => Promise<unknown> }) => config,
  },
}));

import { db } from '@db/server';
import { filterDigestMembersByCompliance } from './policy-acknowledgment-digest-helpers';
import { sendBatchEmailViaApi } from '../../lib/send-email-via-api';
import { getUnsubscribedEmails } from '@trycompai/email/lib/check-unsubscribe';
import { policyAcknowledgmentDigest } from './policy-acknowledgment-digest';

const mockDb = db as unknown as {
  organization: { findMany: ReturnType<typeof vi.fn> };
};
const mockFindMany = mockDb.organization.findMany;
const mockFilterDigestMembersByCompliance = vi.mocked(filterDigestMembersByCompliance);
const mockSendBatchEmailViaApi = vi.mocked(sendBatchEmailViaApi);
const mockGetUnsubscribedEmails = vi.mocked(getUnsubscribedEmails);

// The mock replaces schedules.task with a passthrough that returns the config
// directly, so `.run` is available on the exported constant at runtime.
const taskUnderTest = policyAcknowledgmentDigest as unknown as {
  run: (payload: unknown) => Promise<{
    success: boolean;
    emailsSent: number;
    emailsFailed: number;
    orgsProcessed: number;
    recipients: number;
    orgsSkippedUnsubscribed: number;
  }>;
};

describe('policyAcknowledgmentDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFilterDigestMembersByCompliance.mockImplementation(async (_db, members) => members);
    mockSendBatchEmailViaApi.mockResolvedValue({ taskId: 'run_fake' });
    mockGetUnsubscribedEmails.mockResolvedValue(new Set<string>());
  });

  it('sends one email per member with their pending policies', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policy: [
          {
            id: 'pol_a',
            name: 'Access Control',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
          {
            id: 'pol_b',
            name: 'Backup',
            signedBy: ['mem_alice'],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_alice',
            department: 'it',
            user: {
              id: 'usr_alice',
              name: 'Alice',
              email: 'alice@example.com',
              role: null,
            },
          },
        ],
      },
    ]);

    const result = await taskUnderTest.run({
      timestamp: new Date(),
    } as never);

    expect(mockSendBatchEmailViaApi).toHaveBeenCalledTimes(1);
    const call = mockSendBatchEmailViaApi.mock.calls[0][0];
    expect(call.organizationId).toBe('org_1');
    expect(call.emails).toHaveLength(1);
    expect(call.emails[0].to).toBe('alice@example.com');
    expect(call.emails[0].subject).toBe('You have 1 policy to review at Acme');
    expect(result).toMatchObject({
      success: true,
      emailsSent: 1,
      orgsSkippedUnsubscribed: 0,
    });
  });

  it('skips members with zero pending policies', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policy: [
          {
            id: 'pol_a',
            name: 'Access Control',
            signedBy: ['mem_alice'],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_alice',
            department: 'it',
            user: {
              id: 'usr_alice',
              name: 'Alice',
              email: 'alice@example.com',
              role: null,
            },
          },
        ],
      },
    ]);

    const result = await taskUnderTest.run({
      timestamp: new Date(),
    } as never);

    expect(mockSendBatchEmailViaApi).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, emailsSent: 0 });
  });

  it('skips members without the compliance obligation', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policy: [
          {
            id: 'pol_a',
            name: 'Access Control',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_audit',
            department: null,
            user: {
              id: 'usr_audit',
              name: 'Auditor',
              email: 'audit@example.com',
              role: null,
            },
          },
        ],
      },
    ]);
    mockFilterDigestMembersByCompliance.mockResolvedValueOnce([]);

    const result = await taskUnderTest.run({
      timestamp: new Date(),
    } as never);

    expect(mockSendBatchEmailViaApi).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, emailsSent: 0 });
  });

  it('sends one email with multiple policies when a user has multiple pending policies in the same org', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policy: [
          {
            id: 'pol_a',
            name: 'Access',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
          {
            id: 'pol_b',
            name: 'Backup',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
          {
            id: 'pol_c',
            name: 'Change Mgmt',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_alice',
            department: 'it',
            user: {
              id: 'usr_alice',
              name: 'Alice',
              email: 'alice@example.com',
              role: null,
            },
          },
        ],
      },
    ]);

    await taskUnderTest.run({ timestamp: new Date() } as never);

    expect(mockSendBatchEmailViaApi).toHaveBeenCalledTimes(1);
    expect(mockSendBatchEmailViaApi.mock.calls[0][0].emails[0].subject).toBe(
      'You have 3 policies to review at Acme',
    );
  });

  it('completes successfully when individual sends fail', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policy: [
          {
            id: 'pol_a',
            name: 'Access',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_alice',
            department: 'it',
            user: {
              id: 'usr_alice',
              name: 'Alice',
              email: 'alice@example.com',
              role: null,
            },
          },
          {
            id: 'mem_bob',
            department: 'hr',
            user: {
              id: 'usr_bob',
              name: 'Bob',
              email: 'bob@example.com',
              role: null,
            },
          },
        ],
      },
    ]);
    mockSendBatchEmailViaApi.mockRejectedValueOnce(new Error('Resend 500'));

    const result = await taskUnderTest.run({
      timestamp: new Date(),
    } as never);

    expect(mockSendBatchEmailViaApi).toHaveBeenCalledTimes(1);
    expect(mockSendBatchEmailViaApi.mock.calls[0][0].emails).toHaveLength(2);
    expect(result).toMatchObject({
      success: true,
      emailsSent: 0,
      emailsFailed: 2,
    });
  });

  it('skips members who have unsubscribed from policy notifications', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policy: [
          {
            id: 'pol_a',
            name: 'Access Control',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_alice',
            department: 'it',
            user: {
              id: 'usr_alice',
              name: 'Alice',
              email: 'alice@example.com',
              role: null,
            },
          },
        ],
      },
    ]);
    mockGetUnsubscribedEmails.mockResolvedValueOnce(
      new Set(['alice@example.com']),
    );

    const result = await taskUnderTest.run({ timestamp: new Date() } as never);

    expect(mockSendBatchEmailViaApi).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      emailsSent: 0,
      orgsSkippedUnsubscribed: 1,
    });
  });

  it('rolls up pending policies across orgs into a single email when a user belongs to multiple orgs', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policy: [
          {
            id: 'pol_a',
            name: 'Access Control',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_1',
            department: 'it',
            user: {
              id: 'usr_alice',
              name: 'Alice',
              email: 'alice@example.com',
              role: null,
            },
          },
        ],
      },
      {
        id: 'org_2',
        name: 'Beta',
        policy: [
          {
            id: 'pol_b',
            name: 'Backup',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
          {
            id: 'pol_c',
            name: 'Change Mgmt',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_2',
            department: 'hr',
            user: {
              id: 'usr_alice',
              name: 'Alice',
              email: 'alice@example.com',
              role: null,
            },
          },
        ],
      },
    ]);

    const result = await taskUnderTest.run({ timestamp: new Date() } as never);

    expect(mockSendBatchEmailViaApi).toHaveBeenCalledTimes(1);
    const call = mockSendBatchEmailViaApi.mock.calls[0][0] as {
      emails: Array<{ to: string; subject: string }>;
      organizationId: string;
    };
    expect(call.emails).toHaveLength(1);
    expect(call.emails[0].to).toBe('alice@example.com');
    expect(call.emails[0].subject).toBe(
      'You have 3 policies to review across 2 organizations',
    );
    expect(call.organizationId).toBe('org_1');
    expect(result).toMatchObject({
      success: true,
      orgsProcessed: 2,
      recipients: 1,
      emailsSent: 1,
    });
  });

  it('rolls up across orgs by email when the same person has multiple User records (schema allows duplicate emails)', async () => {
    // Regression: User.email is not @unique in the Prisma schema, so one
    // person can end up with multiple user rows — typically when they get
    // invited to separate orgs through different flows. Keying the rollup
    // on user.id split those duplicates into one email each. Rollup must
    // collapse by normalized email instead.
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policy: [
          {
            id: 'pol_a',
            name: 'Access Control',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_1',
            department: 'it',
            user: {
              id: 'usr_alice_first',
              name: 'Alice',
              email: 'alice@example.com',
              role: null,
            },
          },
        ],
      },
      {
        id: 'org_2',
        name: 'Beta',
        policy: [
          {
            id: 'pol_b',
            name: 'Backup',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_2',
            department: 'hr',
            user: {
              // Different user row, same email — Alice was re-invited under
              // a separate user record.
              id: 'usr_alice_second',
              name: 'Alice',
              email: 'ALICE@example.com',
              role: null,
            },
          },
        ],
      },
    ]);

    const result = await taskUnderTest.run({ timestamp: new Date() } as never);

    expect(mockSendBatchEmailViaApi).toHaveBeenCalledTimes(1);
    const call = mockSendBatchEmailViaApi.mock.calls[0][0] as {
      emails: Array<{ to: string; subject: string }>;
      organizationId: string;
    };
    expect(call.emails[0].subject).toBe(
      'You have 2 policies to review across 2 organizations',
    );
    expect(call.organizationId).toBe('org_1');
    expect(result).toMatchObject({
      success: true,
      orgsProcessed: 2,
      recipients: 1,
      emailsSent: 1,
    });
  });

  it('drops a single org from the rollup when the user is unsubscribed there, but still emails about other orgs', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policy: [
          {
            id: 'pol_a',
            name: 'A',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_1',
            department: 'it',
            user: {
              id: 'usr_alice',
              name: 'Alice',
              email: 'alice@example.com',
              role: null,
            },
          },
        ],
      },
      {
        id: 'org_2',
        name: 'Beta',
        policy: [
          {
            id: 'pol_b',
            name: 'B',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_2',
            department: 'hr',
            user: {
              id: 'usr_alice',
              name: 'Alice',
              email: 'alice@example.com',
              role: null,
            },
          },
        ],
      },
    ]);
    // Alice is unsubscribed from policy notifications in org_1 only.
    mockGetUnsubscribedEmails.mockImplementation(
      async (_db, _emails, _pref, orgId) =>
        orgId === 'org_1'
          ? new Set<string>(['alice@example.com'])
          : new Set<string>(),
    );

    const result = await taskUnderTest.run({ timestamp: new Date() } as never);

    expect(mockSendBatchEmailViaApi).toHaveBeenCalledTimes(1);
    const call = mockSendBatchEmailViaApi.mock.calls[0][0] as {
      emails: Array<{ subject: string }>;
      organizationId: string;
    };
    expect(call.emails[0].subject).toBe('You have 1 policy to review at Beta');
    expect(call.organizationId).toBe('org_2');
    expect(result).toMatchObject({
      success: true,
      orgsProcessed: 2,
      recipients: 1,
      emailsSent: 1,
      orgsSkippedUnsubscribed: 1,
    });
  });

  it('does not send any email to a user who is unsubscribed in every org they belong to', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policy: [
          {
            id: 'pol_a',
            name: 'A',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_1',
            department: 'it',
            user: {
              id: 'usr_alice',
              name: 'Alice',
              email: 'alice@example.com',
              role: null,
            },
          },
        ],
      },
      {
        id: 'org_2',
        name: 'Beta',
        policy: [
          {
            id: 'pol_b',
            name: 'B',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members: [
          {
            id: 'mem_2',
            department: 'hr',
            user: {
              id: 'usr_alice',
              name: 'Alice',
              email: 'alice@example.com',
              role: null,
            },
          },
        ],
      },
    ]);
    mockGetUnsubscribedEmails.mockResolvedValue(
      new Set<string>(['alice@example.com']),
    );

    const result = await taskUnderTest.run({ timestamp: new Date() } as never);

    expect(mockSendBatchEmailViaApi).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      recipients: 0,
      emailsSent: 0,
      orgsSkippedUnsubscribed: 2,
    });
  });

  it('does not email a multi-role member (e.g. owner,employee) who has already signed every policy', async () => {
    // Regression: signedBy stores member ids (from the portal accept action),
    // not user ids. The digest must compare against member.id, otherwise
    // every compliance-obligated member looks "pending" on every policy.
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policy: Array.from({ length: 10 }, (_, i) => ({
          id: `pol_${i}`,
          name: `Policy ${i}`,
          signedBy: ['mem_owner_employee'],
          visibility: 'ALL',
          visibleToDepartments: [],
        })),
        members: [
          {
            id: 'mem_owner_employee',
            role: 'owner,employee',
            department: 'eng',
            user: {
              id: 'usr_owner_employee',
              name: 'Owner Employee',
              email: 'multi@example.com',
              role: null,
            },
          },
        ],
      },
    ]);

    const result = await taskUnderTest.run({ timestamp: new Date() } as never);

    expect(mockSendBatchEmailViaApi).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, emailsSent: 0 });
  });

  it('sends all emails for an org in a single batch call', async () => {
    const members = Array.from({ length: 60 }, (_, i) => ({
      id: `mem_${i}`,
      department: 'it',
      user: {
        id: `usr_${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: null,
      },
    }));

    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_big',
        name: 'BigCo',
        policy: [
          {
            id: 'pol_a',
            name: 'Policy A',
            signedBy: [],
            visibility: 'ALL',
            visibleToDepartments: [],
          },
        ],
        members,
      },
    ]);

    mockGetUnsubscribedEmails.mockResolvedValueOnce(new Set<string>());

    const result = await taskUnderTest.run({ timestamp: new Date() } as never);

    expect(mockSendBatchEmailViaApi).toHaveBeenCalledTimes(1);
    expect(mockSendBatchEmailViaApi.mock.calls[0][0].emails).toHaveLength(60);
    expect(mockSendBatchEmailViaApi.mock.calls[0][0].organizationId).toBe('org_big');
    expect(result).toMatchObject({ success: true, emailsSent: 60 });
  });

  it('filters out dead orgs at the DB query (hasAccess, onboardingCompleted, 90-day session activity)', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    await taskUnderTest.run({ timestamp: new Date() } as never);

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const args = mockFindMany.mock.calls[0][0] as {
      where: {
        hasAccess?: boolean;
        onboardingCompleted?: boolean;
        members?: {
          some?: {
            deactivated?: boolean;
            user?: {
              sessions?: { some?: { updatedAt?: { gte?: Date } } };
            };
          };
        };
      };
    };

    expect(args.where.hasAccess).toBe(true);
    expect(args.where.onboardingCompleted).toBe(true);
    expect(args.where.members?.some?.deactivated).toBe(false);
    const gte = args.where.members?.some?.user?.sessions?.some?.updatedAt?.gte;
    expect(gte).toBeInstanceOf(Date);

    // Mirror the task's local-time setDate(-90) so the assertion survives
    // DST transitions during the 90-day window.
    const expected = new Date();
    expected.setDate(expected.getDate() - 90);
    expect(Math.abs((gte as Date).getTime() - expected.getTime())).toBeLessThan(
      5_000,
    );
  });
});
