import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock useActiveOrganization
const mockUseActiveOrganization = vi.fn();
vi.mock('@/utils/auth-client', () => ({
  useActiveOrganization: () => mockUseActiveOrganization(),
}));

// Mock useParams
const mockUseParams = vi.fn();
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation');
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() })),
    usePathname: vi.fn(() => '/'),
    useSearchParams: vi.fn(() => new URLSearchParams()),
  };
});

// Mock apiClient
const mockGet = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
  ApiClient: vi.fn(),
}));

import { useApiSWR } from './use-api-swr';

describe('useApiSWR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: { items: [] }, status: 200 });
  });

  it('should use activeOrganization ID when available', async () => {
    mockUseActiveOrganization.mockReturnValue({ data: { id: 'org_from_auth' } });
    mockUseParams.mockReturnValue({ orgId: 'org_from_url' });

    const { result } = renderHook(() => useApiSWR('/v1/tasks'));

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGet).toHaveBeenCalledWith('/v1/tasks');
  });

  it('should fall back to URL params orgId when activeOrganization has no data', async () => {
    mockUseActiveOrganization.mockReturnValue({ data: null });
    mockUseParams.mockReturnValue({ orgId: 'org_from_url' });

    const { result } = renderHook(() => useApiSWR('/v1/tasks'));

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGet).toHaveBeenCalledWith('/v1/tasks');
  });

  it('should not fetch when neither activeOrganization nor URL params have org ID', () => {
    mockUseActiveOrganization.mockReturnValue({ data: null });
    mockUseParams.mockReturnValue({});

    const { result } = renderHook(() => useApiSWR('/v1/tasks'));

    expect(result.current.data).toBeUndefined();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('should not fetch when endpoint is null', () => {
    mockUseActiveOrganization.mockReturnValue({ data: { id: 'org_123' } });
    mockUseParams.mockReturnValue({ orgId: 'org_123' });

    const { result } = renderHook(() => useApiSWR(null));

    expect(result.current.data).toBeUndefined();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('should not fetch when enabled is false', () => {
    mockUseActiveOrganization.mockReturnValue({ data: { id: 'org_123' } });
    mockUseParams.mockReturnValue({ orgId: 'org_123' });

    const { result } = renderHook(() => useApiSWR('/v1/tasks', { enabled: false }));

    expect(result.current.data).toBeUndefined();
    expect(mockGet).not.toHaveBeenCalled();
  });
});
