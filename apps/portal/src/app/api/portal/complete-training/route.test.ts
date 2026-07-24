import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Portal self-service must NOT depend on the employee's org RBAC role. This
// suite is the CS-774 regression guard: an employee on a custom role that lacks
// `portal:update` must still be able to mark training complete, because the
// route authorizes on session + organization membership only (mirroring
// accept-policies), never on a permission the custom role may not have.

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  memberFindFirst: vi.fn(),
  completionFindFirst: vi.fn(),
  completionCreate: vi.fn(),
  completionUpdate: vi.fn(),
  completionFindMany: vi.fn(),
}));

vi.mock('@/app/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock('@db/server', () => ({
  db: {
    member: { findFirst: mocks.memberFindFirst },
    employeeTrainingVideoCompletion: {
      findFirst: mocks.completionFindFirst,
      create: mocks.completionCreate,
      update: mocks.completionUpdate,
      findMany: mocks.completionFindMany,
    },
  },
}));

// No service token → the route skips the (best-effort) completion email, so we
// don't need to intercept fetch for these tests.
vi.mock('@/env.mjs', () => ({
  env: { SERVICE_TOKEN_PORTAL: undefined, NEXT_PUBLIC_API_URL: 'http://api.test' },
}));

import { POST } from './route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/portal/complete-training', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/portal/complete-training', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when there is no session', async () => {
    mocks.getSession.mockResolvedValue(null);

    const res = await POST(makeRequest({ videoId: 'sat-1', organizationId: 'org_1' }));

    expect(res.status).toBe(401);
    expect(mocks.completionCreate).not.toHaveBeenCalled();
  });

  it('returns 403 when the user is not a member of the organization', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest({ videoId: 'sat-1', organizationId: 'org_1' }));

    expect(res.status).toBe(403);
    expect(mocks.completionCreate).not.toHaveBeenCalled();
  });

  it('marks training complete for a member whose role lacks portal:update', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    // A custom role with NO portal permission — the exact case that 403'd
    // against the RBAC-gated NestJS endpoint before the fix.
    mocks.memberFindFirst.mockResolvedValue({
      id: 'mem_1',
      userId: 'user_1',
      organizationId: 'org_1',
      role: 'custom-role-without-portal-update',
      deactivated: false,
    });
    mocks.completionFindFirst.mockResolvedValue(null);
    const record = {
      id: 'etvc_1',
      videoId: 'sat-1',
      memberId: 'mem_1',
      completedAt: new Date('2026-07-24T00:00:00.000Z'),
    };
    mocks.completionCreate.mockResolvedValue(record);

    const res = await POST(makeRequest({ videoId: 'sat-1', organizationId: 'org_1' }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('etvc_1');

    // Authorization was membership-scoped, not RBAC.
    expect(mocks.memberFindFirst).toHaveBeenCalledWith({
      where: { userId: 'user_1', organizationId: 'org_1', deactivated: false },
    });
    expect(mocks.completionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ videoId: 'sat-1', memberId: 'mem_1' }),
    });
  });

  it('does not re-stamp an already completed video', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue({
      id: 'mem_1',
      userId: 'user_1',
      organizationId: 'org_1',
      role: 'employee',
      deactivated: false,
    });
    mocks.completionFindFirst.mockResolvedValue({
      id: 'etvc_1',
      videoId: 'sat-1',
      memberId: 'mem_1',
      completedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const res = await POST(makeRequest({ videoId: 'sat-1', organizationId: 'org_1' }));

    expect(res.status).toBe(200);
    expect(mocks.completionCreate).not.toHaveBeenCalled();
    expect(mocks.completionUpdate).not.toHaveBeenCalled();
  });

  it('rejects an unknown video ID', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });

    const res = await POST(
      makeRequest({ videoId: 'not-a-real-video', organizationId: 'org_1' }),
    );

    expect(res.status).toBe(400);
    expect(mocks.memberFindFirst).not.toHaveBeenCalled();
  });
});
