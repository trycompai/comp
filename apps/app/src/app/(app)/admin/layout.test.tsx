import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedirect = vi.fn();
const mockServerApiGet = vi.fn();

vi.mock('@/utils/auth', async () => {
  const { mockAuth } = await import('@/test-utils/mocks/auth');
  return { auth: mockAuth };
});

vi.mock('@/lib/api-server', () => ({
  serverApi: {
    get: (...args: unknown[]) => mockServerApiGet(...args),
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

import { setupAuthMocks, createMockUser, createMockSession } from '@/test-utils/mocks/auth';

const { default: AdminRedirectLayout } = await import('./layout');

describe('(app)/admin/layout - redirect gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /auth when user has no session', async () => {
    setupAuthMocks({ session: null, user: null });

    await expect(
      AdminRedirectLayout({ children: null }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/auth');
  });

  it('redirects to / when user role is not admin (defense in depth)', async () => {
    setupAuthMocks({
      session: createMockSession(),
      user: createMockUser({ role: 'user' }),
    });

    await expect(
      AdminRedirectLayout({ children: null }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/');
  });

  it('does NOT call serverApi when user is not admin', async () => {
    setupAuthMocks({
      session: createMockSession(),
      user: createMockUser({ role: 'user' }),
    });

    await expect(
      AdminRedirectLayout({ children: null }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockServerApiGet).not.toHaveBeenCalled();
  });

  it('redirects admin to /{orgId}/admin when org is found', async () => {
    setupAuthMocks({
      session: createMockSession(),
      user: createMockUser({ role: 'admin' }),
    });
    mockServerApiGet.mockResolvedValue({
      data: { organizations: [{ id: 'org_first' }] },
    });

    await expect(
      AdminRedirectLayout({ children: null }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockServerApiGet).toHaveBeenCalledWith('/v1/auth/me');
    expect(mockRedirect).toHaveBeenCalledWith('/org_first/admin');
  });

  it('redirects admin to / when no orgs found', async () => {
    setupAuthMocks({
      session: createMockSession(),
      user: createMockUser({ role: 'admin' }),
    });
    mockServerApiGet.mockResolvedValue({
      data: { organizations: [] },
    });

    await expect(
      AdminRedirectLayout({ children: null }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/');
  });
});
