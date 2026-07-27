import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EmployeeSyncConnectionsData } from '../data/queries';

vi.mock('@/lib/api-client', () => ({
  apiClient: { post: vi.fn().mockResolvedValue({ data: { success: true } }) },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { useEmployeeSync } from './useEmployeeSync';

const initialData: EmployeeSyncConnectionsData = {
  googleWorkspaceConnectionId: null,
  ripplingConnectionId: null,
  jumpcloudConnectionId: null,
  selectedProvider: 'entra-id',
  lastSyncAt: null,
  nextSyncAt: null,
  availableProviders: [
    {
      slug: 'entra-id',
      name: 'Microsoft Entra ID',
      logoUrl: '',
      connected: true,
      connectionId: 'conn_1',
      lastSyncAt: null,
      nextSyncAt: null,
    },
  ],
};

const ENDPOINT =
  '/v1/integrations/sync/employee-sync-provider?organizationId=org_1';

describe('useEmployeeSync.setSyncProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('turns off auto-sync by POSTing provider: null and confirms to the user', async () => {
    const { result } = renderHook(() =>
      useEmployeeSync({ organizationId: 'org_1', initialData }),
    );

    await act(async () => {
      await result.current.setSyncProvider(null);
    });

    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINT, { provider: null });
    expect(toast.success).toHaveBeenCalledWith('Employee auto-sync turned off');
  });

  it('selects a provider by POSTing its slug', async () => {
    const { result } = renderHook(() =>
      useEmployeeSync({ organizationId: 'org_1', initialData }),
    );

    await act(async () => {
      await result.current.setSyncProvider('entra-id');
    });

    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINT, {
      provider: 'entra-id',
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Microsoft Entra ID set as your employee sync provider',
    );
  });
});
