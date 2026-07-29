import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// CS-790 regression guard: accepting a policy only pushed the member id onto
// `Policy.signedBy`, which carries no timestamp — so nothing recorded WHEN an
// employee signed and auditors could not be shown an acknowledgment date. The
// acceptance must also write an audit log (the timestamped record the policy
// Activity tab and /v1/audit-logs read), atomically with the signature.

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  memberFindFirst: vi.fn(),
  policyFindFirst: vi.fn(),
  policyUpdate: vi.fn(),
  auditLogCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/app/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock('@db/server', () => ({
  db: {
    member: { findFirst: mocks.memberFindFirst },
    policy: { findFirst: mocks.policyFindFirst, update: mocks.policyUpdate },
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
    mocks.transaction.mockResolvedValue([]);
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
    expect(mocks.policyUpdate).not.toHaveBeenCalled();
    expect(mocks.auditLogCreate).not.toHaveBeenCalled();
  });

  it('records the signature and its timestamp in one transaction', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue(MEMBER);
    mocks.policyFindFirst.mockResolvedValue({
      id: 'pol_1',
      name: 'Code of Conduct',
      signedBy: [],
      currentVersionId: 'pv_1',
    });

    const res = await POST(makeRequest({ policyIds: ['pol_1'], memberId: 'mem_1' }));

    expect(res.status).toBe(200);
    expect(mocks.policyUpdate).toHaveBeenCalledWith({
      where: { id: 'pol_1' },
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
    // Both writes are atomic — a signature without its timestamp is the bug.
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0][0]).toHaveLength(2);
  });

  it('does not re-log an acceptance the member already made', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue(MEMBER);
    mocks.policyFindFirst.mockResolvedValue({
      id: 'pol_1',
      name: 'Code of Conduct',
      signedBy: ['mem_1'],
      currentVersionId: 'pv_1',
    });

    const res = await POST(makeRequest({ policyIds: ['pol_1'], memberId: 'mem_1' }));

    expect(res.status).toBe(200);
    // Re-accepting must keep the original signing time, not stamp a new one.
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.auditLogCreate).not.toHaveBeenCalled();
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
    expect(mocks.policyUpdate).not.toHaveBeenCalled();
    expect(mocks.auditLogCreate).not.toHaveBeenCalled();
  });
});
