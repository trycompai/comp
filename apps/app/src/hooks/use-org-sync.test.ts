import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSetActive = vi.fn();
const mockUseActiveOrganization = vi.fn();

vi.mock('@/utils/auth-client', () => ({
  authClient: {
    organization: {
      setActive: (...args: unknown[]) => mockSetActive(...args),
    },
  },
  useActiveOrganization: () => mockUseActiveOrganization(),
}));

import { useOrgSync } from './use-org-sync';

describe('useOrgSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetActive.mockResolvedValue({});
  });

  it('should call setActive when URL orgId differs from active org', async () => {
    mockUseActiveOrganization.mockReturnValue({
      data: { id: 'org_old' },
    });

    renderHook(() => useOrgSync({ orgId: 'org_new' }));

    expect(mockSetActive).toHaveBeenCalledWith({
      organizationId: 'org_new',
    });
  });

  it('should not call setActive when URL orgId matches active org', () => {
    mockUseActiveOrganization.mockReturnValue({
      data: { id: 'org_same' },
    });

    renderHook(() => useOrgSync({ orgId: 'org_same' }));

    expect(mockSetActive).not.toHaveBeenCalled();
  });

  it('should not call setActive when active org data is null', () => {
    mockUseActiveOrganization.mockReturnValue({
      data: null,
    });

    renderHook(() => useOrgSync({ orgId: 'org_123' }));

    expect(mockSetActive).not.toHaveBeenCalled();
  });

  it('should not call setActive when orgId is empty', () => {
    mockUseActiveOrganization.mockReturnValue({
      data: { id: 'org_123' },
    });

    renderHook(() => useOrgSync({ orgId: '' }));

    expect(mockSetActive).not.toHaveBeenCalled();
  });

  it('should handle setActive rejection gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSetActive.mockRejectedValue(new Error('network error'));
    mockUseActiveOrganization.mockReturnValue({
      data: { id: 'org_old' },
    });

    renderHook(() => useOrgSync({ orgId: 'org_new' }));

    // Wait for the promise rejection to be handled
    await act(() => Promise.resolve());

    expect(consoleSpy).toHaveBeenCalledWith(
      '[useOrgSync] Failed to sync active organization:',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('should re-sync when orgId changes after a failed attempt', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSetActive.mockRejectedValueOnce(new Error('network error'));
    mockSetActive.mockResolvedValueOnce({});
    mockUseActiveOrganization.mockReturnValue({
      data: { id: 'org_old' },
    });

    const { rerender } = renderHook(
      ({ orgId }: { orgId: string }) => useOrgSync({ orgId }),
      { initialProps: { orgId: 'org_B' } },
    );

    // First call fails
    await act(() => Promise.resolve());
    expect(mockSetActive).toHaveBeenCalledTimes(1);

    // Org changes — effect should re-run and retry
    rerender({ orgId: 'org_C' });
    expect(mockSetActive).toHaveBeenCalledTimes(2);
    expect(mockSetActive).toHaveBeenLastCalledWith({ organizationId: 'org_C' });

    consoleSpy.mockRestore();
  });
});
