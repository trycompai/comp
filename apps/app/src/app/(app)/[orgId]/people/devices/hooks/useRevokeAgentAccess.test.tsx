import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRevokeAgentAccess } from './useRevokeAgentAccess';

const deleteMock = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiClient: { delete: (url: string) => deleteMock(url) },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

describe('useRevokeAgentAccess', () => {
  beforeEach(() => {
    deleteMock.mockReset();
  });

  it('DELETEs the revoke endpoint for the given deviceId', async () => {
    deleteMock.mockResolvedValue({ status: 204 });
    const { result } = renderHook(() => useRevokeAgentAccess(), { wrapper });

    await act(async () => {
      await result.current.revokeAgentAccess('dev_1');
    });

    expect(deleteMock).toHaveBeenCalledWith('/v1/device-agent/sessions/dev_1');
  });

  it('throws when the API returns an error', async () => {
    deleteMock.mockResolvedValue({ error: 'Forbidden', status: 403 });
    const { result } = renderHook(() => useRevokeAgentAccess(), { wrapper });

    await expect(result.current.revokeAgentAccess('dev_1')).rejects.toThrow('Forbidden');
  });

  it('throws on network-level rejection', async () => {
    deleteMock.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useRevokeAgentAccess(), { wrapper });

    await expect(result.current.revokeAgentAccess('dev_1')).rejects.toThrow('network error');
  });
});
