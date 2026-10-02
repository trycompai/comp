import { portalPolicySelect } from '@/lib/portal-policy-access';
import type { Policy, PolicyVersion } from '@db';
import { createElement, type ComponentProps, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  memberFindFirst: vi.fn(),
  policyFindFirst: vi.fn(),
  policyViewer: vi.fn(),
}));

vi.mock('@/app/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock('@db/server', () => ({
  db: {
    member: { findFirst: mocks.memberFindFirst },
    policy: { findFirst: mocks.policyFindFirst },
  },
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock('next/link', () => ({
  default: ({ children }: { children: ReactNode }) => createElement('a', null, children),
}));
vi.mock('@trycompai/design-system', () => {
  const Wrapper = ({ children }: { children?: ReactNode }) => createElement('div', null, children);
  return {
    Badge: Wrapper,
    Breadcrumb: () => null,
    Card: Wrapper,
    CardContent: Wrapper,
    CardFooter: Wrapper,
    PageLayout: Wrapper,
    Stack: Wrapper,
    Text: Wrapper,
  };
});
vi.mock('./PolicyAcceptButton', () => ({ PolicyAcceptButton: () => null }));
vi.mock('./PolicyViewer', () => ({ default: mocks.policyViewer }));

import PolicyPage from './page';
import type PolicyViewer from './PolicyViewer';

type PolicyFixture = Pick<
  Policy,
  | 'id'
  | 'organizationId'
  | 'name'
  | 'description'
  | 'status'
  | 'isArchived'
  | 'archivedAt'
  | 'content'
  | 'draftContent'
  | 'visibility'
  | 'visibleToDepartments'
  | 'displayFormat'
  | 'pdfUrl'
  | 'signedBy'
  | 'updatedAt'
> & {
  currentVersion: Pick<PolicyVersion, 'id' | 'policyId' | 'content' | 'pdfUrl' | 'version'>;
};

function makePolicy(): PolicyFixture {
  return {
    id: 'pol_requested',
    organizationId: 'org_authorized',
    name: 'Internal employee policy',
    description: 'Confidential description',
    status: 'published',
    visibility: 'ALL',
    visibleToDepartments: [],
    isArchived: false,
    archivedAt: null,
    displayFormat: 'EDITOR',
    pdfUrl: null,
    content: [{ text: 'Confidential policy content' }],
    draftContent: [{ text: 'Unreleased policy revision' }],
    currentVersion: {
      id: 'pv_current',
      policyId: 'pol_requested',
      content: [{ text: 'Confidential current version' }],
      pdfUrl: null,
      version: 1,
    },
    signedBy: [],
    updatedAt: new Date('2026-01-01'),
  };
}

type PolicyLookup = {
  where: Partial<PolicyFixture> & {
    OR?: Array<{ visibility: string; visibleToDepartments?: { has: string } }>;
  };
  select?: Record<string, unknown>;
};
type MemberLookup = {
  where: { userId: string; organizationId: string; deactivated?: boolean; isActive?: boolean };
};

describe('Portal policy page authorization', () => {
  let policy: PolicyFixture;
  let deactivated: boolean;
  let isActive: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    policy = makePolicy();
    deactivated = false;
    isActive = true;
    mocks.getSession.mockResolvedValue({ user: { id: 'usr_employee' } });
    mocks.memberFindFirst.mockImplementation(({ where }: MemberLookup) => {
      const matches =
        where.userId === 'usr_employee' &&
        where.organizationId === 'org_authorized' &&
        (where.deactivated === undefined || where.deactivated === deactivated) &&
        (where.isActive === undefined || where.isActive === isActive);
      return Promise.resolve(
        matches
          ? { id: 'mem_employee', organizationId: 'org_authorized', department: 'engineering' }
          : null,
      );
    });
    // Model database filtering, rather than returning a policy regardless of
    // its query. An id-only lookup must reproduce the original disclosure.
    mocks.policyFindFirst.mockImplementation(({ where, select }: PolicyLookup) => {
      const matches = Object.entries(where)
        .filter(([key]) => key !== 'OR')
        .every(([key, value]) => policy[key as keyof PolicyFixture] === value);
      const visible = where.OR?.some(
        (condition) =>
          condition.visibility === policy.visibility &&
          (!condition.visibleToDepartments ||
            policy.visibleToDepartments.includes(condition.visibleToDepartments.has)),
      );
      if (!matches || !visible) return Promise.resolve(null);
      if (!select) return Promise.resolve(policy);
      return Promise.resolve(
        Object.fromEntries(Object.entries(policy).filter(([key]) => select[key])),
      );
    });
    mocks.policyViewer.mockImplementation(
      ({ policy: visiblePolicy }: ComponentProps<typeof PolicyViewer>) =>
        createElement('pre', null, JSON.stringify(visiblePolicy)),
    );
  });

  async function renderPolicy({ orgId = 'org_authorized' }: { orgId?: string } = {}) {
    const page = await PolicyPage({
      params: Promise.resolve({ orgId, policyId: 'pol_requested' }),
    });
    return renderToStaticMarkup(page);
  }

  it('renders a published policy for an active member of its organization', async () => {
    const html = await renderPolicy();

    expect(html).toContain('Confidential policy content');
    expect(html).toContain('Confidential current version');
    expect(mocks.policyViewer).toHaveBeenCalled();
  });

  it('does not serialize unpublished draft content on a published policy', async () => {
    const html = await renderPolicy();

    expect(html).toContain('Confidential policy content');
    expect(html).not.toContain('Unreleased policy revision');
    expect(mocks.policyFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ select: portalPolicySelect }),
    );
  });

  it('does not expose another organization policy through an authorized organization URL', async () => {
    policy.organizationId = 'org_victim';

    await expect(renderPolicy()).rejects.toThrow('REDIRECT:/org_authorized');
    expect(mocks.policyViewer).not.toHaveBeenCalled();
  });

  it('does not expose a draft policy', async () => {
    policy.status = 'draft';

    await expect(renderPolicy()).rejects.toThrow('REDIRECT:/org_authorized');
    expect(mocks.policyViewer).not.toHaveBeenCalled();
  });

  it('does not expose a user-archived policy', async () => {
    policy.isArchived = true;

    await expect(renderPolicy()).rejects.toThrow('REDIRECT:/org_authorized');
    expect(mocks.policyViewer).not.toHaveBeenCalled();
  });

  it('does not expose a sync-archived policy that still has published status', async () => {
    policy.archivedAt = new Date('2026-01-01');

    await expect(renderPolicy()).rejects.toThrow('REDIRECT:/org_authorized');
    expect(mocks.policyViewer).not.toHaveBeenCalled();
  });

  it('does not expose policies limited to another department', async () => {
    policy.visibility = 'DEPARTMENT';
    policy.visibleToDepartments = ['finance'];
    await expect(renderPolicy()).rejects.toThrow('REDIRECT:/org_authorized');
    expect(mocks.policyViewer).not.toHaveBeenCalled();
  });

  it('does not expose a malformed current version belonging to another policy', async () => {
    policy.currentVersion.policyId = 'pol_foreign';
    await expect(renderPolicy()).rejects.toThrow('REDIRECT:/org_authorized');
    expect(mocks.policyViewer).not.toHaveBeenCalled();
  });

  it('does not fetch a policy for a deactivated member', async () => {
    deactivated = true;

    await expect(renderPolicy()).rejects.toThrow('REDIRECT:/');
    expect(mocks.policyFindFirst).not.toHaveBeenCalled();
    expect(mocks.policyViewer).not.toHaveBeenCalled();
  });

  it('does not fetch a policy for an inactive member who is not deactivated', async () => {
    isActive = false;

    await expect(renderPolicy()).rejects.toThrow('REDIRECT:/');
    expect(mocks.policyFindFirst).not.toHaveBeenCalled();
    expect(mocks.policyViewer).not.toHaveBeenCalled();
  });

  it('does not fetch a policy when the user is not a member of the URL organization', async () => {
    await expect(renderPolicy({ orgId: 'org_unrelated' })).rejects.toThrow('REDIRECT:/');
    expect(mocks.policyFindFirst).not.toHaveBeenCalled();
    expect(mocks.policyViewer).not.toHaveBeenCalled();
  });

  it('does not fetch or render policies without an authenticated session', async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(renderPolicy()).rejects.toThrow('REDIRECT:/auth');
    expect(mocks.memberFindFirst).not.toHaveBeenCalled();
    expect(mocks.policyFindFirst).not.toHaveBeenCalled();
    expect(mocks.policyViewer).not.toHaveBeenCalled();
  });
});
