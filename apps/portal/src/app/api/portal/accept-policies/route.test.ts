import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@db/server', () => ({
  Prisma: {},
  db: {
    member: { findFirst: vi.fn(), findUnique: vi.fn() },
    policy: { findUnique: vi.fn(), update: vi.fn() },
    policyAcknowledgment: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { auth } from '@/app/lib/auth';
import { db } from '@db/server';
import { POST } from './route';

const mockAuth = auth as unknown as {
  api: { getSession: ReturnType<typeof vi.fn> };
};
const mockDb = db as unknown as {
  member: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  policy: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  policyAcknowledgment: { upsert: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const makeRequest = (body: unknown) =>
  new Request('http://localhost/api/portal/accept-policies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];

describe('POST /api/portal/accept-policies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.api.getSession.mockResolvedValue({ user: { id: 'usr_alice' } });
    mockDb.member.findFirst.mockResolvedValue({
      id: 'mem_alice',
      userId: 'usr_alice',
      deactivated: false,
    });
    mockDb.$transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          policy: mockDb.policy,
          member: mockDb.member,
          policyAcknowledgment: mockDb.policyAcknowledgment,
        }),
    );
  });

  it('upserts an ack for each policy with denormalized member name+email', async () => {
    mockDb.member.findUnique.mockResolvedValue({
      id: 'mem_alice',
      user: { name: 'Alice Example', email: 'alice@example.com' },
    });
    mockDb.policy.findUnique.mockResolvedValue({
      id: 'pol_1',
      currentVersionId: 'pv_1',
      organizationId: 'org_abc',
      signedBy: [],
    });

    const res = await POST(
      makeRequest({ policyIds: ['pol_1'], memberId: 'mem_alice' }),
    );

    expect(await res.json()).toEqual({ success: true });
    expect(mockDb.policyAcknowledgment.upsert).toHaveBeenCalledWith({
      where: {
        policyVersionId_memberId: {
          policyVersionId: 'pv_1',
          memberId: 'mem_alice',
        },
      },
      create: {
        policyVersionId: 'pv_1',
        memberId: 'mem_alice',
        memberName: 'Alice Example',
        memberEmail: 'alice@example.com',
        organizationId: 'org_abc',
      },
      update: {},
    });
  });

  it('skips a policy with null currentVersionId and continues the batch', async () => {
    mockDb.member.findUnique.mockResolvedValue({
      id: 'mem_alice',
      user: { name: 'Alice', email: 'alice@example.com' },
    });
    mockDb.policy.findUnique
      .mockResolvedValueOnce({
        id: 'pol_1',
        currentVersionId: null,
        organizationId: 'org_abc',
        signedBy: [],
      })
      .mockResolvedValueOnce({
        id: 'pol_2',
        currentVersionId: 'pv_2',
        organizationId: 'org_abc',
        signedBy: [],
      });

    const res = await POST(
      makeRequest({ policyIds: ['pol_1', 'pol_2'], memberId: 'mem_alice' }),
    );

    expect(await res.json()).toEqual({ success: true });
    expect(mockDb.policyAcknowledgment.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.policyAcknowledgment.upsert.mock.calls[0][0].create.policyVersionId).toBe('pv_2');
  });

  it('returns 401 when no session', async () => {
    mockAuth.api.getSession.mockResolvedValueOnce(null);
    const res = await POST(
      makeRequest({ policyIds: ['pol_1'], memberId: 'mem_alice' }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when member does not belong to the session user', async () => {
    mockDb.member.findFirst.mockResolvedValueOnce(null);
    const res = await POST(
      makeRequest({ policyIds: ['pol_1'], memberId: 'mem_alice' }),
    );
    expect(res.status).toBe(403);
  });
});
