import type { Member } from '@db';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  memberFindFirst: vi.fn(),
  policyFindFirst: vi.fn(),
  policyUpdateMany: vi.fn(),
  getSignedUrl: vi.fn(),
  policyFindMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/app/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('@db/server', () => ({
  db: {
    member: { findFirst: mocks.memberFindFirst },
    policy: { findFirst: mocks.policyFindFirst },
    $transaction: mocks.transaction,
  },
}));
vi.mock('@/utils/s3', () => ({
  BUCKET_NAME: 'test-bucket',
  s3Client: {},
  getSignedUrl: mocks.getSignedUrl,
}));

import { POST as acceptPolicies } from './accept-policies/route';
import { POST as markPolicyCompleted } from './mark-policy-completed/route';
import { GET as getPolicyPdfUrl } from './policy-pdf-url/route';

type MemberFixture = Pick<
  Member,
  'id' | 'userId' | 'organizationId' | 'isActive' | 'deactivated' | 'department'
>;
const policy = {
  id: 'pol_employee',
  organizationId: 'org_employer',
  signedBy: [],
  pdfUrl: 'employee-policy.pdf',
  currentVersion: null,
};

function makePostRequest({ path, body }: { path: string; body: unknown }) {
  return new NextRequest(`http://localhost/api/portal/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const routes = [
  {
    name: 'accept-policies',
    execute: () =>
      acceptPolicies(
        makePostRequest({
          path: 'accept-policies',
          body: {
            policyIds: [policy.id],
            memberId: 'mem_employee',
            organizationId: policy.organizationId,
          },
        }),
      ),
    mutation: true,
  },
  {
    name: 'mark-policy-completed',
    execute: () =>
      markPolicyCompleted(
        makePostRequest({
          path: 'mark-policy-completed',
          body: { policyId: policy.id, organizationId: policy.organizationId },
        }),
      ),
    mutation: true,
  },
  {
    name: 'policy-pdf-url',
    execute: () =>
      getPolicyPdfUrl(
        new NextRequest(
          `http://localhost/api/portal/policy-pdf-url?policyId=${policy.id}&organizationId=${policy.organizationId}`,
        ),
      ),
    mutation: false,
  },
];

describe.each(routes)('Portal $name active membership', ({ execute, mutation }) => {
  let member: MemberFixture;

  beforeEach(() => {
    vi.clearAllMocks();
    member = {
      id: 'mem_employee',
      userId: 'usr_employee',
      organizationId: 'org_employer',
      isActive: true,
      department: 'engineering',
      deactivated: false,
    };
    mocks.getSession.mockResolvedValue({ user: { id: 'usr_employee' } });
    mocks.policyFindFirst.mockResolvedValue(policy);
    mocks.policyFindMany.mockResolvedValue([policy]);
    mocks.policyUpdateMany.mockResolvedValue({ count: 1 });
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
    mocks.getSignedUrl.mockResolvedValue('https://files.test/employee-policy.pdf');
    mocks.memberFindFirst.mockImplementation(({ where }: { where: Partial<MemberFixture> }) => {
      const matches = Object.entries(where).every(
        ([key, value]) => member[key as keyof MemberFixture] === value,
      );
      return Promise.resolve(matches ? member : null);
    });
  });

  it('allows an active member to access their own organization policy', async () => {
    const response = await execute();

    expect(await response.json()).toMatchObject({ success: true });
    if (mutation) {
      expect(mocks.policyUpdateMany).toHaveBeenCalledOnce();
      return;
    }
    expect(mocks.getSignedUrl).toHaveBeenCalledOnce();
  });

  it('denies an inactive member who is not deactivated', async () => {
    member.isActive = false;

    const response = await execute();

    expect(await response.json()).toHaveProperty('error');
    expect(mocks.policyUpdateMany).not.toHaveBeenCalled();
    expect(mocks.getSignedUrl).not.toHaveBeenCalled();
  });

  it('denies a deactivated member even when isActive is true', async () => {
    member.deactivated = true;

    const response = await execute();

    expect(await response.json()).toHaveProperty('error');
    expect(mocks.policyUpdateMany).not.toHaveBeenCalled();
    expect(mocks.getSignedUrl).not.toHaveBeenCalled();
  });

  it('does not grant policy access through membership in another organization', async () => {
    member.organizationId = 'org_other';

    await execute();

    expect(mocks.policyUpdateMany).not.toHaveBeenCalled();
    expect(mocks.getSignedUrl).not.toHaveBeenCalled();
  });

  it('denies unauthenticated requests', async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await execute();

    expect(response.status).toBe(401);
    expect(mocks.memberFindFirst).not.toHaveBeenCalled();
    expect(mocks.policyUpdateMany).not.toHaveBeenCalled();
    expect(mocks.getSignedUrl).not.toHaveBeenCalled();
  });
});
