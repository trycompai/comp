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
  new Request('http://localhost/api/portal/mark-policy-completed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];

describe('POST /api/portal/mark-policy-completed', () => {
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

  it('upserts an ack with denormalized member name+email and pushes to signedBy', async () => {
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

    const res = await POST(makeRequest({ policyId: 'pol_1' }));

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
    expect(mockDb.policy.update).toHaveBeenCalledWith({
      where: { id: 'pol_1' },
      data: { signedBy: { push: 'mem_alice' } },
    });
  });

  it('upserts ack but skips signedBy push when member already signed', async () => {
    mockDb.member.findUnique.mockResolvedValue({
      id: 'mem_alice',
      user: { name: 'Alice Example', email: 'alice@example.com' },
    });
    mockDb.policy.findUnique.mockResolvedValue({
      id: 'pol_1',
      currentVersionId: 'pv_1',
      organizationId: 'org_abc',
      signedBy: ['mem_alice'],
    });

    const res = await POST(makeRequest({ policyId: 'pol_1' }));

    expect(await res.json()).toEqual({ success: true });
    expect(mockDb.policyAcknowledgment.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.policy.update).not.toHaveBeenCalled();
  });

  it('returns 500 when policy has no currentVersionId', async () => {
    mockDb.member.findUnique.mockResolvedValue({
      id: 'mem_alice',
      user: { name: 'Alice', email: 'alice@example.com' },
    });
    mockDb.policy.findUnique.mockResolvedValue({
      id: 'pol_1',
      currentVersionId: null,
      organizationId: 'org_abc',
      signedBy: [],
    });

    const res = await POST(makeRequest({ policyId: 'pol_1' }));

    expect(res.status).toBe(500);
  });

  it('returns 401 when no session', async () => {
    mockAuth.api.getSession.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ policyId: 'pol_1' }));
    expect(res.status).toBe(401);
  });

  it('returns 404 when member not found', async () => {
    mockDb.member.findFirst.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ policyId: 'pol_1' }));
    expect(res.status).toBe(404);
  });
});
