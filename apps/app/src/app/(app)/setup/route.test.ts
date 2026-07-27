import { vi } from 'vitest';

vi.mock('@/utils/auth', async () => {
  const { mockAuth } = await import('@/test-utils/mocks/auth');
  return { auth: mockAuth };
});

const { mockServerApiGet, mockCreateSetupSession } = vi.hoisted(() => ({
  mockServerApiGet: vi.fn(),
  mockCreateSetupSession: vi.fn(async () => ({ id: 'setup_1' })),
}));
vi.mock('@/lib/api-server', () => ({ serverApi: { get: mockServerApiGet } }));
vi.mock('./lib/setup-session', () => ({ createSetupSession: mockCreateSetupSession }));

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { redirect } from 'next/navigation';
import { GET } from './route';
import { mockAuthApi, createMockSession, createMockUser } from '@/test-utils/mocks/auth';

const mockRedirect = vi.mocked(redirect);

interface MeData {
  organizations: unknown[];
  pendingInvitation: { id: string } | null;
  hasInactiveMembership?: boolean;
}
const mockMe = (data: MeData) => mockServerApiGet.mockResolvedValue({ data, status: 200 });
const call = (url: string) => GET(new NextRequest(url));

describe('/setup route — CS-569 offboard guard vs invite precedence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSetupSession.mockResolvedValue({ id: 'setup_1' });
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
    mockAuthApi.getSession.mockResolvedValue({
      session: createMockSession(),
      user: createMockUser(),
    });
  });

  it('redirects an offboarded user with no invite to access-removed', async () => {
    mockMe({ organizations: [], pendingInvitation: null, hasInactiveMembership: true });

    await expect(call('http://localhost/setup')).rejects.toThrow('REDIRECT:/auth/access-removed');
    expect(mockCreateSetupSession).not.toHaveBeenCalled();
  });

  it('does NOT block an offboarded user arriving via ?inviteCode= (invite handled downstream)', async () => {
    // Regression (cubic): the guard must not pre-empt the legacy invite entry.
    mockMe({ organizations: [], pendingInvitation: null, hasInactiveMembership: true });

    await expect(call('http://localhost/setup?inviteCode=inv_abc')).rejects.toThrow(
      'REDIRECT:/setup/setup_1?inviteCode=inv_abc',
    );
    // Guard is skipped entirely when an invite code is present.
    expect(mockServerApiGet).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalledWith('/auth/access-removed');
  });

  it('routes an offboarded user with a pending invitation to the invite, not access-removed', async () => {
    mockMe({
      organizations: [],
      pendingInvitation: { id: 'inv_xyz' },
      hasInactiveMembership: true,
    });

    await expect(call('http://localhost/setup')).rejects.toThrow('REDIRECT:/invite/inv_xyz');
    expect(mockRedirect).not.toHaveBeenCalledWith('/auth/access-removed');
  });

  it('lets a genuinely new user through to onboarding', async () => {
    mockMe({ organizations: [], pendingInvitation: null, hasInactiveMembership: false });

    await expect(call('http://localhost/setup')).rejects.toThrow('REDIRECT:/setup/setup_1');
    expect(mockCreateSetupSession).toHaveBeenCalled();
  });
});
