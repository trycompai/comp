import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedirect = vi.fn();

vi.mock('@/utils/auth', async () => {
  const { mockAuth } = await import('@/test-utils/mocks/auth');
  return { auth: mockAuth };
});

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

const { default: AdminLayout } = await import('./layout');

describe('[orgId]/admin/layout - auth gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to frameworks when user has no session', async () => {
    setupAuthMocks({ session: null, user: null });

    await expect(
      AdminLayout({
        children: null,
        params: Promise.resolve({ orgId: 'org_1' }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/org_1/frameworks');
  });

  it('redirects to frameworks when user role is not admin', async () => {
    setupAuthMocks({
      session: createMockSession(),
      user: createMockUser({ role: 'user' }),
    });

    await expect(
      AdminLayout({
        children: null,
        params: Promise.resolve({ orgId: 'org_1' }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/org_1/frameworks');
  });

  it('redirects to frameworks when user role is null', async () => {
    setupAuthMocks({
      session: createMockSession(),
      user: createMockUser({ role: null }),
    });

    await expect(
      AdminLayout({
        children: null,
        params: Promise.resolve({ orgId: 'org_1' }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/org_1/frameworks');
  });

  it('renders children when user is a platform admin', async () => {
    setupAuthMocks({
      session: createMockSession(),
      user: createMockUser({ role: 'admin' }),
    });

    const result = await AdminLayout({
      children: 'admin content',
      params: Promise.resolve({ orgId: 'org_1' }),
    });

    expect(result).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('does not leak data — redirect happens before any API calls for non-admins', async () => {
    setupAuthMocks({
      session: createMockSession(),
      user: createMockUser({ role: 'user' }),
    });

    await expect(
      AdminLayout({
        children: null,
        params: Promise.resolve({ orgId: 'org_1' }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });
});
