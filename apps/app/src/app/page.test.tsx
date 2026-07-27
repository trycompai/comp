import { vi } from 'vitest';

// Mock the auth module before importing the page so getSession is controllable.
vi.mock('@/utils/auth', async () => {
  const { mockAuth } = await import('@/test-utils/mocks/auth');
  return { auth: mockAuth };
});

// serverApi.get('/v1/auth/me') drives every routing decision on this page.
// vi.hoisted so the fn exists when the hoisted vi.mock factory runs.
const { mockServerApiGet } = vi.hoisted(() => ({ mockServerApiGet: vi.fn() }));
vi.mock('@/lib/api-server', () => ({
  serverApi: { get: mockServerApiGet },
}));

// The page imports `db` from '@db/server' (only used for custom-role
// resolution, which the zero-org redirect paths never reach). Stub it so the
// test doesn't pull the real Prisma client.
vi.mock('@db/server', () => ({ db: {} }));

// '@/lib/permissions' pulls in @trycompai/auth (a built package) and is only
// used past the zero-org redirects. Stub it so the test stays hermetic.
vi.mock('@/lib/permissions', () => ({
  getDefaultRoute: vi.fn(() => '/'),
  mergePermissions: vi.fn(),
  resolveBuiltInPermissions: vi.fn(() => ({ permissions: {}, customRoleNames: [] })),
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';
import Page from './page';
import { mockAuthApi, createMockSession, createMockUser } from '@/test-utils/mocks/auth';

const mockRedirect = vi.mocked(redirect);

interface MeData {
  organizations: unknown[];
  pendingInvitation: { id: string } | null;
  hasInactiveMembership?: boolean;
}

const mockMe = (data: MeData) => {
  mockServerApiGet.mockResolvedValue({ data, status: 200 });
};

describe('RootPage onboarding-loop guard (CS-569)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The real Next.js redirect() throws to halt rendering. Emulate that so
    // execution stops at the first redirect and we can assert its target.
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
    mockAuthApi.getSession.mockResolvedValue({
      session: createMockSession(),
      user: createMockUser(),
    });
  });

  it('sends an offboarded user (no active org, has a deactivated membership) to the access-removed page, NOT onboarding', async () => {
    // This is the bug: without the guard, this user was redirected to /setup,
    // which silently spawned a spurious empty org and locked them into a loop.
    mockMe({ organizations: [], pendingInvitation: null, hasInactiveMembership: true });

    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'REDIRECT:/auth/access-removed',
    );

    expect(mockRedirect).toHaveBeenCalledWith('/auth/access-removed');
    expect(mockRedirect).not.toHaveBeenCalledWith('/setup');
  });

  it('still sends a genuinely new user (no memberships at all) to onboarding', async () => {
    mockMe({ organizations: [], pendingInvitation: null, hasInactiveMembership: false });

    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('REDIRECT:/setup');

    expect(mockRedirect).toHaveBeenCalledWith('/setup');
    expect(mockRedirect).not.toHaveBeenCalledWith('/auth/access-removed');
  });

  it('lets an explicit ?inviteCode= win over the offboard guard (hands off to /setup for downstream invite handling)', async () => {
    // Regression (cubic P2): an offboarded user landing on /?inviteCode=... must
    // still be able to accept the invite, not be short-circuited to access-removed.
    mockMe({ organizations: [], pendingInvitation: null, hasInactiveMembership: true });

    await expect(
      Page({ searchParams: Promise.resolve({ inviteCode: 'inv_abc' }) }),
    ).rejects.toThrow('REDIRECT:/setup?inviteCode=inv_abc');

    expect(mockRedirect).not.toHaveBeenCalledWith('/auth/access-removed');
  });

  it('prefers a pending invitation over the access-removed page', async () => {
    mockMe({
      organizations: [],
      pendingInvitation: { id: 'inv_abc123' },
      hasInactiveMembership: true,
    });

    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'REDIRECT:/invite/inv_abc123',
    );

    expect(mockRedirect).toHaveBeenCalledWith('/invite/inv_abc123');
    expect(mockRedirect).not.toHaveBeenCalledWith('/auth/access-removed');
  });
});
