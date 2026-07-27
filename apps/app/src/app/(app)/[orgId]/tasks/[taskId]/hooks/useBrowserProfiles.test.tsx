import { apiClient } from '@/lib/api-client';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserAuthProfile } from './types';
import { useBrowserProfiles } from './useBrowserProfiles';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_1' }),
}));

const profile = {
  id: 'bap_1',
  hostname: 'github.com',
  loginIdentity: '',
  displayName: 'GitHub',
  contextId: 'ctx_1',
  status: 'verified',
} satisfies BrowserAuthProfile;

// Fresh SWR cache per test — without this, results leak across tests.
const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('useBrowserProfiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the profiles on success', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [profile],
      error: undefined,
      status: 200,
    });

    const { result } = renderHook(() => useBrowserProfiles(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profiles).toEqual([profile]);
    expect(result.current.isError).toBe(false);
  });

  it('surfaces an HTTP error instead of masking it as an empty list', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: undefined,
      error: 'Internal server error',
      status: 500,
    });

    const { result } = renderHook(() => useBrowserProfiles(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.profiles).toEqual([]);
  });

  it('surfaces a network error instead of masking it as an empty list', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useBrowserProfiles(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.profiles).toEqual([]);
  });

  it('keeps the last good list when a refresh fails', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: [profile],
      error: undefined,
      status: 200,
    });

    const { result } = renderHook(() => useBrowserProfiles(), { wrapper });
    await waitFor(() => expect(result.current.profiles).toEqual([profile]));

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: undefined,
      error: 'Internal server error',
      status: 500,
    });
    // fetchProfiles must not reject on a failed refresh (call sites await it
    // mid-flow, e.g. right after connecting a vendor).
    await result.current.fetchProfiles();

    await waitFor(() => expect(result.current.isError).toBe(true));
    // The stale-but-real list is kept — not blanked into "no connections".
    expect(result.current.profiles).toEqual([profile]);
  });
});
