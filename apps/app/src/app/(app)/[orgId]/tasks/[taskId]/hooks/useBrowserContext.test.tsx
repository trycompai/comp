import { apiClient } from '@/lib/api-client';
import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserAuthProfile } from './types';
import { useBrowserContext } from './useBrowserContext';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const unverifiedProfile = {
  id: 'bap_1',
  hostname: 'github.com',
  loginIdentity: '',
  displayName: 'github.com browser profile',
  contextId: 'ctx_1',
  status: 'unverified',
} satisfies BrowserAuthProfile;

describe('useBrowserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not treat unverified profiles as connected', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [unverifiedProfile],
      error: undefined,
      status: 200,
    });

    const { result } = renderHook(() => useBrowserContext());

    await act(async () => {
      await result.current.checkContextStatus();
    });

    expect(result.current.status).toBe('no-context');
    expect(result.current.contextId).toBeNull();
    expect(result.current.profileId).toBeNull();
  });

  it('does not show auth Live View when target navigation fails', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({
        data: { profile: unverifiedProfile, isNew: false },
        error: undefined,
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { sessionId: 'bbs_1', liveViewUrl: 'https://live.browserbase.test/session' },
        error: undefined,
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { success: false, error: 'Navigation failed' },
        error: undefined,
        status: 200,
      })
      .mockResolvedValueOnce({ data: null, error: undefined, status: 200 });

    const { result } = renderHook(() => useBrowserContext());

    await act(async () => {
      await result.current.startAuth('https://github.com');
    });

    await waitFor(() => {
      expect(result.current.showAuthFlow).toBe(false);
    });
    expect(result.current.liveViewUrl).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Navigation failed');
    expect(apiClient.post).toHaveBeenLastCalledWith('/v1/browserbase/session/close', {
      sessionId: 'bbs_1',
    });
  });

  it('keeps auth Live View open when verification has not logged in yet', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({
        data: { profile: unverifiedProfile, isNew: false },
        error: undefined,
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { sessionId: 'bbs_1', liveViewUrl: 'https://live.browserbase.test/session' },
        error: undefined,
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { success: true },
        error: undefined,
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { auth: { isLoggedIn: false }, profile: unverifiedProfile },
        error: undefined,
        status: 200,
      });

    const { result } = renderHook(() => useBrowserContext());

    await act(async () => {
      await result.current.startAuth('https://github.com');
    });

    expect(result.current.showAuthFlow).toBe(true);

    await act(async () => {
      await result.current.checkAuth('https://github.com');
    });

    expect(result.current.showAuthFlow).toBe(true);
    expect(result.current.liveViewUrl).toBe('https://live.browserbase.test/session');
    expect(result.current.sessionId).toBe('bbs_1');
    expect(apiClient.post).not.toHaveBeenCalledWith('/v1/browserbase/session/close', {
      sessionId: 'bbs_1',
    });
    expect(toast.error).toHaveBeenCalledWith(
      'Still not logged in. Finish login, then click Check & Save again.',
    );
  });
});
