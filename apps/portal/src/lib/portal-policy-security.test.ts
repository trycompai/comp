import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  memberFindFirst: vi.fn(),
  policyFindFirst: vi.fn(),
  policyFindMany: vi.fn(),
  policyUpdateMany: vi.fn(),
  transaction: vi.fn(),
  sign: vi.fn(),
}));
vi.mock('@/app/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('@db/server', () => ({
  db: {
    member: { findFirst: mocks.memberFindFirst },
    policy: { findFirst: mocks.policyFindFirst },
    $transaction: mocks.transaction,
  },
}));
vi.mock('@/utils/s3', () => ({ BUCKET_NAME: 'test', s3Client: {}, getSignedUrl: mocks.sign }));

import { POST as accept } from '@/app/api/portal/accept-policies/route';
import { POST as complete } from '@/app/api/portal/mark-policy-completed/route';
import { GET } from '@/app/api/portal/policy-pdf-url/route';
import { getPortalPolicy, portalPolicySelect } from './portal-policy-access';

interface PolicyFilter {
  id?: string | { in: string[] };
  organizationId?: string;
  status?: string;
  isArchived?: boolean;
  archivedAt?: null;
  isRequiredToSign?: boolean;
  OR?: Array<{ visibility: string; visibleToDepartments?: { has: string } }>;
}
const published = {
  id: 'pol_own',
  organizationId: 'org_own',
  status: 'published',
  isArchived: false,
  archivedAt: null,
  isRequiredToSign: true,
  visibility: 'ALL',
  visibleToDepartments: new Array<string>(),
  signedBy: new Array<string>(),
  pdfUrl: 'own.pdf',
  currentVersion: { id: 'pv_own', policyId: 'pol_own', pdfUrl: 'current.pdf' },
};
let policy = { ...published };

function matches(where: PolicyFilter): boolean {
  if (typeof where.id === 'string' && where.id !== policy.id) return false;
  if (typeof where.id === 'object' && !where.id.in.includes(policy.id)) return false;
  if (where.organizationId !== policy.organizationId || where.status !== policy.status)
    return false;
  if (where.isArchived !== policy.isArchived || where.archivedAt !== policy.archivedAt)
    return false;
  if (where.isRequiredToSign && !policy.isRequiredToSign) return false;
  return Boolean(
    where.OR?.some(
      (condition) =>
        condition.visibility === policy.visibility &&
        (!condition.visibleToDepartments ||
          policy.visibleToDepartments.includes(condition.visibleToDepartments.has)),
    ),
  );
}
function request({ body, raw }: { body?: unknown; raw?: string }): NextRequest {
  return new NextRequest('http://localhost/api/portal/accept-policies', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  });
}
function pdf(versionId?: string): NextRequest {
  const params = new URLSearchParams({ policyId: 'pol_own', organizationId: 'org_own' });
  if (versionId) params.set('versionId', versionId);
  return new NextRequest(`http://localhost/api/portal/policy-pdf-url?${params}`);
}
const body = { organizationId: 'org_own', memberId: 'mem_own', policyIds: ['pol_own'] };

beforeEach(() => {
  vi.resetAllMocks();
  policy = { ...published, signedBy: [], visibleToDepartments: [] };
  mocks.getSession.mockResolvedValue({ user: { id: 'user_own' } });
  mocks.memberFindFirst.mockImplementation(({ where }) =>
    where.userId === 'user_own' &&
    where.organizationId === 'org_own' &&
    where.deactivated === false &&
    (!where.id || where.id === 'mem_own')
      ? { id: 'mem_own', organizationId: 'org_own', department: 'engineering' }
      : null,
  );
  mocks.policyFindFirst.mockImplementation(({ where }: { where: PolicyFilter }) =>
    Promise.resolve(matches(where) ? policy : null),
  );
  mocks.policyFindMany.mockImplementation(({ where }: { where: PolicyFilter }) =>
    Promise.resolve(matches(where) ? [policy] : []),
  );
  mocks.policyUpdateMany.mockResolvedValue({ count: 1 });
  mocks.sign.mockResolvedValue('https://signed.test/own');
  const transaction = {
    member: { findFirst: mocks.memberFindFirst },
    policy: {
      findMany: mocks.policyFindMany,
      updateMany: mocks.policyUpdateMany,
    },
  };
  mocks.transaction.mockImplementation(
    (callback: (client: typeof transaction) => Promise<unknown>) => callback(transaction),
  );
});

describe('employee portal policy authorization', () => {
  it('reads and signs the current published policy for an active member', async () => {
    const response = await GET(pdf('pv_own'));
    expect(response.status).toBe(200);
    expect(mocks.sign).toHaveBeenCalledOnce();
    expect(mocks.sign.mock.calls[0]?.[1].input.Key).toBe('current.pdf');
  });

  it.each(['pv_foreign', 'pv_pending', 'pv_historical'])(
    'rejects unauthorized version %s',
    async (id) => {
      expect((await GET(pdf(id))).status).toBe(404);
      expect(mocks.sign).not.toHaveBeenCalled();
    },
  );

  it('rejects a corrupt current-version reference to a foreign policy', async () => {
    policy.currentVersion = { id: 'pv_own', policyId: 'pol_foreign', pdfUrl: 'foreign.pdf' };
    expect((await GET(pdf('pv_own'))).status).toBe(404);
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it.each([
    ['foreign', { organizationId: 'org_foreign' }],
    ['draft', { status: 'draft' }],
    ['archived', { isArchived: true }],
    ['sync archived', { archivedAt: new Date() }],
    ['another department', { visibility: 'DEPARTMENT', visibleToDepartments: ['finance'] }],
  ])('rejects %s reads and acknowledgments without signing or writing', async (_name, changes) => {
    Object.assign(policy, changes);
    expect(
      await getPortalPolicy({
        policyId: policy.id,
        organizationId: 'org_own',
        department: 'engineering',
      }),
    ).toBeNull();
    expect((await GET(pdf())).status).toBe(404);
    expect((await accept(request({ body }))).status).toBe(404);
    expect(
      (await complete(request({ body: { organizationId: 'org_own', policyId: 'pol_own' } })))
        .status,
    ).toBe(404);
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.policyUpdateMany).not.toHaveBeenCalled();
  });

  it('allows a policy targeted to the member department', async () => {
    policy.visibility = 'DEPARTMENT';
    policy.visibleToDepartments = ['engineering'];
    expect((await GET(pdf())).status).toBe(200);
    expect((await accept(request({ body }))).status).toBe(200);
  });

  it('allows voluntary acknowledgment of a published optional policy', async () => {
    policy.isRequiredToSign = false;
    expect((await accept(request({ body }))).status).toBe(200);
    expect(mocks.policyUpdateMany).toHaveBeenCalledOnce();
  });

  it('never selects draft content or pending-version content for serialization', async () => {
    await getPortalPolicy({
      policyId: 'pol_own',
      organizationId: 'org_own',
      department: 'engineering',
    });
    expect(mocks.policyFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ select: portalPolicySelect }),
    );
    expect(portalPolicySelect).not.toHaveProperty('draftContent');
    expect(portalPolicySelect).not.toHaveProperty('pendingVersionId');
  });

  it('rejects removed or deactivated membership before policy access', async () => {
    mocks.memberFindFirst.mockResolvedValue(null);
    expect((await GET(pdf())).status).toBe(403);
    expect((await accept(request({ body }))).status).toBe(403);
    expect(
      (await complete(request({ body: { organizationId: 'org_own', policyId: 'pol_own' } })))
        .status,
    ).toBe(403);
    expect(mocks.policyFindFirst).not.toHaveBeenCalled();
    expect(mocks.policyFindMany).not.toHaveBeenCalled();
    expect(mocks.policyUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects a supplied member belonging to another user or organization', async () => {
    expect((await accept(request({ body: { ...body, memberId: 'mem_foreign' } }))).status).toBe(
      403,
    );
    expect(mocks.policyUpdateMany).not.toHaveBeenCalled();
  });

  it('validates the entire batch before any mutation', async () => {
    expect(
      (await accept(request({ body: { ...body, policyIds: ['pol_own', 'pol_foreign'] } }))).status,
    ).toBe(404);
    expect(mocks.policyUpdateMany).not.toHaveBeenCalled();
  });

  it('accepts duplicate IDs once with an atomic append scoped to the member tenant', async () => {
    expect(
      (await accept(request({ body: { ...body, policyIds: ['pol_own', 'pol_own'] } }))).status,
    ).toBe(200);
    expect(mocks.policyUpdateMany).toHaveBeenCalledOnce();
    expect(mocks.policyUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'pol_own',
        organizationId: 'org_own',
        status: 'published',
        isArchived: false,
        archivedAt: null,
        NOT: { signedBy: { has: 'mem_own' } },
      }),
      data: { signedBy: { push: 'mem_own' } },
    });
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it('selects the member in the requested organization when completing a policy', async () => {
    expect(
      (await complete(request({ body: { organizationId: 'org_own', policyId: 'pol_own' } })))
        .status,
    ).toBe(200);
    expect(mocks.memberFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_own', organizationId: 'org_own', deactivated: false },
      }),
    );
    expect(mocks.policyUpdateMany).toHaveBeenCalledOnce();
  });

  it('makes already accepted acknowledgments idempotent', async () => {
    policy.signedBy = ['mem_own'];
    const response = await complete(
      request({ body: { organizationId: 'org_own', policyId: 'pol_own' } }),
    );
    expect(await response.json()).toEqual({ success: true, alreadySigned: true });
  });

  it('rejects missing org context, malformed JSON and no session without writes', async () => {
    expect(
      (await accept(request({ body: { memberId: 'mem_own', policyIds: ['pol_own'] } }))).status,
    ).toBe(400);
    expect((await complete(request({ raw: '{' }))).status).toBe(400);
    mocks.getSession.mockResolvedValue(null);
    expect((await GET(pdf())).status).toBe(401);
    expect((await accept(request({ body }))).status).toBe(401);
    expect(mocks.policyUpdateMany).not.toHaveBeenCalled();
  });
});
