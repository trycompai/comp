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
  frameworkInstanceFindFirst: vi.fn(),
  completionUpsert: vi.fn(),
  completionUpdate: vi.fn(),
  completionFindMany: vi.fn(),
  logger: vi.fn(),
  fetch: vi.fn(),
  env: {
    SERVICE_TOKEN_PORTAL: undefined as string | undefined,
    NEXT_PUBLIC_API_URL: 'http://api.test',
  },
}));

vi.mock('@/app/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock('@db/server', () => ({
  db: {
    member: { findFirst: mocks.memberFindFirst },
    frameworkInstance: { findFirst: mocks.frameworkInstanceFindFirst },
    employeeTrainingVideoCompletion: {
      upsert: mocks.completionUpsert,
      update: mocks.completionUpdate,
      findMany: mocks.completionFindMany,
    },
  },
}));

// SERVICE_TOKEN_PORTAL defaults to undefined so most tests skip the
// (best-effort) completion email and don't need to intercept fetch. The email
// failure test below sets it to exercise the fetch path.
vi.mock('@/env.mjs', () => ({ env: mocks.env }));
vi.mock('@/utils/logger', () => ({ logger: mocks.logger }));
vi.stubGlobal('fetch', mocks.fetch);

import { POST } from './route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/portal/complete-training', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Sends a raw (unserialized) body so we can exercise the malformed-JSON path.
function makeRawRequest(raw: string): NextRequest {
  return new NextRequest('http://localhost/api/portal/complete-training', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw,
  });
}

describe('POST /api/portal/complete-training', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.SERVICE_TOKEN_PORTAL = undefined;
  });

  it('returns 401 when there is no session', async () => {
    mocks.getSession.mockResolvedValue(null);

    const res = await POST(makeRequest({ videoId: 'sat-1', organizationId: 'org_1' }));

    expect(res.status).toBe(401);
    expect(mocks.completionUpsert).not.toHaveBeenCalled();
  });

  it('returns 400 when the request body is not valid JSON', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });

    // A malformed body makes req.json() throw. Before the fix that surfaced as
    // an unhandled 500; the contract is a 400 "Invalid request body".
    const res = await POST(makeRawRequest('{ not: valid json'));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request body');
    expect(mocks.memberFindFirst).not.toHaveBeenCalled();
    expect(mocks.completionUpsert).not.toHaveBeenCalled();
  });

  it('returns 403 when the user is not a member of the organization', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest({ videoId: 'sat-1', organizationId: 'org_1' }));

    expect(res.status).toBe(403);
    expect(mocks.completionUpsert).not.toHaveBeenCalled();
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
    const record = {
      id: 'etvc_1',
      videoId: 'sat-1',
      memberId: 'mem_1',
      completedAt: new Date('2026-07-24T00:00:00.000Z'),
    };
    mocks.completionUpsert.mockResolvedValue(record);

    const res = await POST(makeRequest({ videoId: 'sat-1', organizationId: 'org_1' }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('etvc_1');

    // Authorization was membership-scoped, not RBAC.
    expect(mocks.memberFindFirst).toHaveBeenCalledWith({
      where: { userId: 'user_1', organizationId: 'org_1', deactivated: false },
    });
    // Regression guard for the concurrent-completion race: the write must be a
    // single atomic upsert keyed by the (memberId, videoId) unique constraint,
    // never a find-then-create that two callers can both fall through and 500.
    expect(mocks.completionUpsert).toHaveBeenCalledWith({
      where: { memberId_videoId: { memberId: 'mem_1', videoId: 'sat-1' } },
      create: expect.objectContaining({ videoId: 'sat-1', memberId: 'mem_1' }),
      update: {},
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
    // Upsert returns the pre-existing, already-stamped row.
    mocks.completionUpsert.mockResolvedValue({
      id: 'etvc_1',
      videoId: 'sat-1',
      memberId: 'mem_1',
      completedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const res = await POST(makeRequest({ videoId: 'sat-1', organizationId: 'org_1' }));

    expect(res.status).toBe(200);
    // completedAt is already set, so the follow-up stamp must not run.
    expect(mocks.completionUpdate).not.toHaveBeenCalled();
  });

  it('stamps a pre-existing record whose completedAt is still null', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue({
      id: 'mem_1',
      userId: 'user_1',
      organizationId: 'org_1',
      role: 'employee',
      deactivated: false,
    });
    // Upsert finds the row but it was never finished (completedAt: null).
    mocks.completionUpsert.mockResolvedValue({
      id: 'etvc_1',
      videoId: 'sat-1',
      memberId: 'mem_1',
      completedAt: null,
    });
    mocks.completionUpdate.mockResolvedValue({
      id: 'etvc_1',
      videoId: 'sat-1',
      memberId: 'mem_1',
      completedAt: new Date('2026-07-24T00:00:00.000Z'),
    });

    const res = await POST(makeRequest({ videoId: 'sat-1', organizationId: 'org_1' }));

    expect(res.status).toBe(200);
    // The null completedAt is stamped via a follow-up update keyed by id.
    expect(mocks.completionUpdate).toHaveBeenCalledWith({
      where: { id: 'etvc_1' },
      data: expect.objectContaining({ completedAt: expect.any(Date) }),
    });
  });

  it('rejects an unknown video ID', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });

    const res = await POST(
      makeRequest({ videoId: 'not-a-real-video', organizationId: 'org_1' }),
    );

    expect(res.status).toBe(400);
    expect(mocks.memberFindFirst).not.toHaveBeenCalled();
  });

  // HIPAA eligibility must match the NestJS training service: an org without the
  // HIPAA framework enabled cannot complete hipaa-sat-1, otherwise this route
  // would mint HIPAA completion records (and certificate artifacts) the service
  // would reject, desyncing the two paths.
  it('rejects hipaa-sat-1 when the org does not have the HIPAA framework', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue({
      id: 'mem_1',
      userId: 'user_1',
      organizationId: 'org_1',
      role: 'employee',
      deactivated: false,
    });
    // No HIPAA framework instance for this org.
    mocks.frameworkInstanceFindFirst.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ videoId: 'hipaa-sat-1', organizationId: 'org_1' }),
    );

    expect(res.status).toBe(400);
    expect(mocks.frameworkInstanceFindFirst).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', framework: { name: 'HIPAA' } },
      select: { id: true },
    });
    expect(mocks.completionUpsert).not.toHaveBeenCalled();
  });

  it('marks hipaa-sat-1 complete when the org has the HIPAA framework', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue({
      id: 'mem_1',
      userId: 'user_1',
      organizationId: 'org_1',
      role: 'employee',
      deactivated: false,
    });
    mocks.frameworkInstanceFindFirst.mockResolvedValue({ id: 'frm_1' });
    const record = {
      id: 'etvc_hipaa',
      videoId: 'hipaa-sat-1',
      memberId: 'mem_1',
      completedAt: new Date('2026-07-24T00:00:00.000Z'),
    };
    mocks.completionUpsert.mockResolvedValue(record);

    const res = await POST(
      makeRequest({ videoId: 'hipaa-sat-1', organizationId: 'org_1' }),
    );

    expect(res.status).toBe(200);
    expect(mocks.completionUpsert).toHaveBeenCalledWith({
      where: { memberId_videoId: { memberId: 'mem_1', videoId: 'hipaa-sat-1' } },
      create: expect.objectContaining({ videoId: 'hipaa-sat-1', memberId: 'mem_1' }),
      update: {},
    });
  });

  // The completion email is best-effort, but a non-2xx response from the API is
  // a real delivery failure and must be logged. fetch does not reject on 4xx/5xx,
  // so before the fix the failure was silently treated as success (no log, no
  // signal to retry). Marking training complete must still succeed.
  it('logs when the completion email request returns a non-2xx response', async () => {
    mocks.env.SERVICE_TOKEN_PORTAL = 'svc-token';
    mocks.getSession.mockResolvedValue({ user: { id: 'user_1' } });
    mocks.memberFindFirst.mockResolvedValue({
      id: 'mem_1',
      userId: 'user_1',
      organizationId: 'org_1',
      role: 'employee',
      deactivated: false,
    });
    mocks.frameworkInstanceFindFirst.mockResolvedValue({ id: 'frm_1' });
    mocks.completionUpsert.mockResolvedValue({
      id: 'etvc_hipaa',
      videoId: 'hipaa-sat-1',
      memberId: 'mem_1',
      completedAt: new Date('2026-07-24T00:00:00.000Z'),
    });
    mocks.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    // The failure is logged via console.error so it is visible in PRODUCTION (the
    // dev-only `logger` util would have swallowed it outside development).
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(
      makeRequest({ videoId: 'hipaa-sat-1', organizationId: 'org_1' }),
    );

    // Completion is persisted regardless — the email is best-effort.
    expect(res.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledWith(
      'http://api.test/v1/training/send-hipaa-completion-email',
      expect.objectContaining({ method: 'POST' }),
    );
    // The HTTP failure must surface (in prod too), not be swallowed as success.
    expect(errorSpy).toHaveBeenCalledWith(
      'Error triggering training completion email',
      expect.objectContaining({ memberId: 'mem_1' }),
    );

    errorSpy.mockRestore();
  });
});
