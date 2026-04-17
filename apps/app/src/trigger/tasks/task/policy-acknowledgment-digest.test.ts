import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@db/server', () => ({
  db: {
    organization: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/compliance', () => ({
  filterComplianceMembers: vi.fn(),
}));

vi.mock('../../lib/send-email-via-api', () => ({
  sendEmailViaApi: vi.fn(),
}));

vi.mock('@trigger.dev/sdk', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  schedules: {
    task: (config: { run: (payload: unknown) => Promise<unknown> }) => config,
  },
}));

import { db } from '@db/server';
import { filterComplianceMembers } from '@/lib/compliance';
import { sendEmailViaApi } from '../../lib/send-email-via-api';
import { policyAcknowledgmentDigest } from './policy-acknowledgment-digest';

const mockDb = db as unknown as {
  organization: { findMany: ReturnType<typeof vi.fn> };
};
const mockFindMany = mockDb.organization.findMany;
const mockFilterComplianceMembers = vi.mocked(
  filterComplianceMembers as ReturnType<typeof vi.fn>,
);
const mockSendEmailViaApi = vi.mocked(
  sendEmailViaApi as ReturnType<typeof vi.fn>,
);

// The mock replaces schedules.task with a passthrough that returns the config
// directly, so `.run` is available on the exported constant at runtime.
const taskUnderTest = policyAcknowledgmentDigest as unknown as {
  run: (payload: unknown) => Promise<{
    success: boolean;
    emailsSent: number;
    emailsFailed: number;
    orgsProcessed: number;
  }>;
};

describe('policyAcknowledgmentDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFilterComplianceMembers.mockImplementation(
      async (members: unknown[]) => members,
    );
    mockSendEmailViaApi.mockResolvedValue({ taskId: 'run_fake' });
  });

  it('sends one email per member with their pending policies', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policies: [
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
            signedBy: ['usr_alice'],
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

    expect(mockSendEmailViaApi).toHaveBeenCalledTimes(1);
    const call = mockSendEmailViaApi.mock.calls[0][0];
    expect(call.to).toBe('alice@example.com');
    expect(call.subject).toBe('You have 1 policy to review at Acme');
    expect(call.organizationId).toBe('org_1');
    expect(result).toMatchObject({ success: true, emailsSent: 1 });
  });

  it('skips members with zero pending policies', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policies: [
          {
            id: 'pol_a',
            name: 'Access Control',
            signedBy: ['usr_alice'],
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

    expect(mockSendEmailViaApi).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, emailsSent: 0 });
  });

  it('skips members without the compliance obligation', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policies: [
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
    mockFilterComplianceMembers.mockResolvedValueOnce([]);

    const result = await taskUnderTest.run({
      timestamp: new Date(),
    } as never);

    expect(mockSendEmailViaApi).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, emailsSent: 0 });
  });

  it('sends one email with multiple policies when a user has multiple pending policies in the same org', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policies: [
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

    expect(mockSendEmailViaApi).toHaveBeenCalledTimes(1);
    expect(mockSendEmailViaApi.mock.calls[0][0].subject).toBe(
      'You have 3 policies to review at Acme',
    );
  });

  it('completes successfully when individual sends fail', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'org_1',
        name: 'Acme',
        policies: [
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
    mockSendEmailViaApi
      .mockRejectedValueOnce(new Error('Resend 500'))
      .mockResolvedValueOnce({ taskId: 'run_ok' });

    const result = await taskUnderTest.run({
      timestamp: new Date(),
    } as never);

    expect(mockSendEmailViaApi).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      success: true,
      emailsSent: 1,
      emailsFailed: 1,
    });
  });
});
