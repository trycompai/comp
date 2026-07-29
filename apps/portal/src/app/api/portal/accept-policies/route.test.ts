import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// CS-790 regression guard: accepting a policy only pushed the member id onto
// `Policy.signedBy`, which carries no timestamp — so nothing recorded WHEN an
// employee signed and auditors could not be shown an acknowledgment date. The
// acceptance must also write an audit log (the timestamped record the policy
// Activity tab and /v1/audit-logs read), atomically with the signature, and
// exactly once per member even when accepts for the same policy overlap.

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  memberFindFirst: vi.fn(),
  policyFindFirst: vi.fn(),
  policyUpdateMany: vi.fn(),
  auditLogCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/app/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock('@db/server', () => ({
  db: {
    member: { findFirst: mocks.memberFindFirst },
    policy: { findFirst: mocks.policyFindFirst, updateMany: mocks.policyUpdateMany },
    auditLog: { create: mocks.auditLogCreate },
    $transaction: mocks.transaction,
  },
}));

import { POST } from './route';

const MEMBER = {
  id: 'mem_1',
  userId: 'user_1',
  organizationId: 'org_1',
  deactivated: false,
};

const POLICY = {
  id: 'pol_1',
  name: 'Code of Conduct',
  currentVersionId: 'pv_1',
};

/** The transaction client exposes the same models as `db`, like Prisma's does. */
const TX = {
  policy: { updateMany: mocks.policyUpdateMany },
  auditLog: { create: mocks.auditLogCreate },
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/portal/accept-policies', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/portal/accept-policies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation((arg) => arg(TX));
    // Models the row lock behind the conditional claim: whichever accept gets
    // to the row first matches it, every later one matches zero rows.
    let claimed = false;
    mocks.policyUpdateMany.mockImplementation(async () => {
      if (claimed) {
        return { count: 0 };
      }
      claimed = true;
      return { count: 1 };
    });
  });

  it('returns 401 when there is no session', async () => {
    mocks.getSession.mockResolvedValue(null);

    const res = await POST(makeRequest({ policyIds: ['pol_1'], memberId: 'mem_1' }));

    expect(res.status).toBe(401);
    expect(mocks.auditLogCreate).not.toHaveBeenCalled();
  });

  it('returns 403 when the member does not belong to the authenticated user', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest({ policyIds: ['pol_1'], memberId: 'mem_other' }));

    expect(res.status).toBe(403);
    expect(mocks.policyUpdateMany).not.toHaveBeenCalled();
    expect(mocks.auditLogCreate).not.toHaveBeenCalled();
  });

  it('records the signature and its timestamp in one transaction', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue(MEMBER);
    mocks.policyFindFirst.mockResolvedValue(POLICY);

    const res = await POST(makeRequest({ policyIds: ['pol_1'], memberId: 'mem_1' }));

    expect(res.status).toBe(200);
    // Conditional write, so an already-signed member cannot be appended twice.
    expect(mocks.policyUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'pol_1',
        organizationId: 'org_1',
        NOT: { signedBy: { has: 'mem_1' } },
      },
      data: { signedBy: { push: 'mem_1' } },
    });
    // The timestamped acceptance record: AuditLog.timestamp defaults to now(),
    // so this row is what answers "when did this member sign this policy".
    expect(mocks.auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org_1',
        userId: 'user_1',
        memberId: 'mem_1',
        entityType: 'policy',
        entityId: 'pol_1',
        description: 'accepted this policy',
        data: expect.objectContaining({ action: 'accept', policyVersionId: 'pv_1' }),
      }),
    });
    // Claim and log are one atomic unit — a signature without its timestamp is
    // the bug, so the check must happen inside the transaction, not before it.
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0][0]).toBeTypeOf('function');
  });

  it('does not re-log an acceptance the member already made', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue(MEMBER);
    mocks.policyFindFirst.mockResolvedValue(POLICY);
    // The member is already in signedBy, so the conditional claim matches nothing.
    mocks.policyUpdateMany.mockResolvedValue({ count: 0 });

    const res = await POST(makeRequest({ policyIds: ['pol_1'], memberId: 'mem_1' }));

    expect(res.status).toBe(200);
    // Re-accepting must keep the original signing time, not stamp a new one.
    expect(mocks.auditLogCreate).not.toHaveBeenCalled();
  });

  it('logs one acceptance when two accepts of the same policy overlap', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue(MEMBER);
    mocks.policyFindFirst.mockResolvedValue(POLICY);

    const [first, second] = await Promise.all([
      POST(makeRequest({ policyIds: ['pol_1'], memberId: 'mem_1' })),
      POST(makeRequest({ policyIds: ['pol_1'], memberId: 'mem_1' })),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // Both requests read the policy before either wrote, so only the atomic
    // claim keeps this from becoming two signatures with two timestamps.
    expect(mocks.policyUpdateMany).toHaveBeenCalledTimes(2);
    expect(mocks.auditLogCreate).toHaveBeenCalledTimes(1);
  });

  it('accepts a duplicated policy id once', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue(MEMBER);
    mocks.policyFindFirst.mockResolvedValue(POLICY);

    const res = await POST(makeRequest({ policyIds: ['pol_1', 'pol_1'], memberId: 'mem_1' }));

    expect(res.status).toBe(200);
    expect(mocks.policyFindFirst).toHaveBeenCalledTimes(1);
    expect(mocks.auditLogCreate).toHaveBeenCalledTimes(1);
  });

  it('does not sign a policy outside the member organization', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue(MEMBER);
    // Scoped lookup finds nothing for another org's policy id.
    mocks.policyFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest({ policyIds: ['pol_other_org'], memberId: 'mem_1' }));

    expect(res.status).toBe(200);
    expect(mocks.policyFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pol_other_org', organizationId: 'org_1' } }),
    );
    expect(mocks.policyUpdateMany).not.toHaveBeenCalled();
    expect(mocks.auditLogCreate).not.toHaveBeenCalled();
  });
});
