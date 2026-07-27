import { vi } from 'vitest';

// Mock the auth module before importing the page so getSession is controllable.
vi.mock('@/utils/auth', async () => {
  const { mockAuth } = await import('@/test-utils/mocks/auth');
  return { auth: mockAuth };
});

// env.mjs validates required server env vars at import time. The page redirects
// before reading any of them, so a stub keeps the test hermetic.
vi.mock('@/env.mjs', () => ({ env: {} }));

// Avoid pulling the client sign-in component graph (authClient, lucide, etc.)
// into the test; the redirect paths return before rendering the form.
vi.mock('@/components/login-form', () => ({ LoginForm: () => null }));

import { describe, it, expect, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';
import Page from './page';
import { mockAuthApi, createMockSession, createMockUser } from '@/test-utils/mocks/auth';

const mockRedirect = vi.mocked(redirect);

describe('Auth page invite routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The real Next.js redirect() throws to halt rendering. Emulate that so
    // execution stops at the first redirect and we can assert its target.
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
  });

  it('routes an authenticated invitee with an active org to the invite flow (not onboarding)', async () => {
    // Regression: an auditor who already has a Comp AI session with an active
    // org clicks an invite link. Previously this redirected to /setup and the
    // invite code was discarded, dumping them into the onboarding wizard.
    mockAuthApi.getSession.mockResolvedValue({
      session: createMockSession({ activeOrganizationId: 'org_existing' }),
      user: createMockUser({ email: 'auditor@example.com' }),
    });

    await expect(
      Page({ searchParams: Promise.resolve({ inviteCode: 'inv_abc123' }) }),
    ).rejects.toThrow('REDIRECT:/invite/inv_abc123');

    expect(mockRedirect).toHaveBeenCalledWith('/invite/inv_abc123');
    expect(mockRedirect).not.toHaveBeenCalledWith('/setup');
  });

  it('still sends an authenticated user without an invite code to home', async () => {
    mockAuthApi.getSession.mockResolvedValue({
      session: createMockSession({ activeOrganizationId: 'org_existing' }),
      user: createMockUser(),
    });

    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('REDIRECT:/');

    expect(mockRedirect).toHaveBeenCalledWith('/');
  });
});
