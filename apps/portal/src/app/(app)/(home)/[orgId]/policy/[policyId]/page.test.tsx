import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), member: vi.fn(), policy: vi.fn() }));
vi.mock('@/app/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('@db/server', () => ({
  db: {
    member: { findFirst: mocks.member },
    policy: { findFirst: mocks.policy },
  },
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock('./PolicyViewer', () => ({ default: () => null }));
vi.mock('./PolicyAcceptButton', () => ({ PolicyAcceptButton: () => null }));
vi.mock('@trycompai/design-system', () => ({
  Badge: () => null,
  Breadcrumb: () => null,
  Card: () => null,
  CardContent: () => null,
  CardFooter: () => null,
  PageLayout: () => null,
  Stack: () => null,
  Text: () => null,
}));

import { portalPolicySelect } from '@/lib/portal-policy-access';
import PolicyPage from './page';

const params = () => Promise.resolve({ orgId: 'org_own', policyId: 'pol_own' });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: 'user_own' } });
  mocks.member.mockResolvedValue({
    id: 'mem_own',
    organizationId: 'org_own',
    department: 'engineering',
  });
  mocks.policy.mockResolvedValue({
    id: 'pol_own',
    organizationId: 'org_own',
    name: 'Published policy',
    status: 'published',
    signedBy: [],
    currentVersion: null,
    content: [],
    displayFormat: 'EDITOR',
    pdfUrl: null,
    description: null,
    updatedAt: new Date('2026-01-01'),
  });
});

describe('employee policy page', () => {
  it('requires a session before checking membership or reading policy data', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(PolicyPage({ params: params() })).rejects.toThrow('redirect:/auth');
    expect(mocks.member).not.toHaveBeenCalled();
    expect(mocks.policy).not.toHaveBeenCalled();
  });

  it('requires a current active member of the URL organization before reading policy data', async () => {
    mocks.member.mockResolvedValue(null);
    await expect(PolicyPage({ params: params() })).rejects.toThrow('redirect:/');
    expect(mocks.member).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_own', organizationId: 'org_own', deactivated: false },
      }),
    );
    expect(mocks.policy).not.toHaveBeenCalled();
  });

  it('denies a policy not returned by the tenant/publication/visibility scope', async () => {
    mocks.policy.mockResolvedValue(null);
    await expect(PolicyPage({ params: params() })).rejects.toThrow('redirect:/org_own');
    expect(mocks.policy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'pol_own',
          organizationId: 'org_own',
          status: 'published',
          isArchived: false,
          archivedAt: null,
        }),
        select: portalPolicySelect,
      }),
    );
  });

  it('renders an authorized policy using only the selected employee-facing fields', async () => {
    const result = await PolicyPage({ params: params() });
    expect(result).toBeTruthy();
    expect(mocks.policy).toHaveBeenCalledWith(
      expect.objectContaining({ select: portalPolicySelect }),
    );
    expect(portalPolicySelect).not.toHaveProperty('draftContent');
    expect(portalPolicySelect).not.toHaveProperty('pendingVersionId');
  });
});
