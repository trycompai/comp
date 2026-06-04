import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDeviceSync } from './useDeviceSync';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (url: string) => getMock(url),
    post: (url: string, body?: unknown) => postMock(url, body),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{ provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false }}
    >
      {children}
    </SWRConfig>
  );
}

const jamf = {
  slug: 'jamf',
  name: 'Jamf',
  logoUrl: '/jamf.png',
  connected: true,
  connectionId: 'icn_1',
  lastSyncAt: null,
  nextSyncAt: null,
};

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  // No provider selected yet; one connected provider available.
  getMock.mockImplementation((url: string) => {
    if (url.includes('device-sync-provider')) {
      return Promise.resolve({ data: { provider: null }, status: 200 });
    }
    if (url.includes('available-providers')) {
      return Promise.resolve({ data: { providers: [jamf] }, status: 200 });
    }
    return Promise.resolve({ data: null, status: 200 });
  });
});

describe('useDeviceSync', () => {
  it('does not run the sync when setting the provider fails', async () => {
    // Persisting the provider choice fails.
    postMock.mockImplementation((url: string) => {
      if (url.includes('device-sync-provider')) {
        return Promise.resolve({ error: 'nope', status: 500 });
      }
      return Promise.resolve({ data: { success: true }, status: 200 });
    });

    const { result } = renderHook(() => useDeviceSync({ organizationId: 'org_1' }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.availableProviders).toHaveLength(1));

    await act(async () => {
      await result.current.syncDevices('jamf');
    });

    // setSyncProvider was attempted...
    expect(
      postMock.mock.calls.some(([url]) => url.includes('device-sync-provider')),
    ).toBe(true);
    // ...but the device sync POST must NOT fire with a stale/unsaved provider.
    expect(postMock.mock.calls.some(([url]) => url.includes('/devices'))).toBe(false);
  });

  it('makes no API calls when disabled (no integration:update permission)', () => {
    renderHook(() => useDeviceSync({ organizationId: 'org_1', enabled: false }), {
      wrapper,
    });

    expect(getMock).not.toHaveBeenCalled();
  });
});
