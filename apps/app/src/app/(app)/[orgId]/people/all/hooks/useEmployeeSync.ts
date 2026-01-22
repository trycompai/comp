'use client';

import { apiClient } from '@/lib/api-client';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

import type { EmployeeSyncConnectionsData } from '../data/queries';

type SyncProvider = 'google-workspace' | 'rippling' | 'jumpcloud';

interface SyncResult {
  success: boolean;
  totalFound: number;
  imported: number;
  reactivated: number;
  deactivated: number;
  skipped: number;
  errors: number;
}

interface UseEmployeeSyncOptions {
  organizationId: string;
  initialData: EmployeeSyncConnectionsData;
}

interface UseEmployeeSyncReturn {
  googleWorkspaceConnectionId: string | null;
  ripplingConnectionId: string | null;
  jumpcloudConnectionId: string | null;
  selectedProvider: SyncProvider | null;
  isSyncing: boolean;
  syncEmployees: (provider: SyncProvider) => Promise<SyncResult | null>;
  setSyncProvider: (provider: SyncProvider | null) => Promise<void>;
  hasAnyConnection: boolean;
  getProviderName: (provider: SyncProvider) => string;
  getProviderLogo: (provider: SyncProvider) => string;
}

const PROVIDER_CONFIG = {
  'google-workspace': {
    name: 'Google Workspace',
    shortName: 'Google',
    logo: 'https://img.logo.dev/google.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ&format=png&retina=true',
  },
  rippling: {
    name: 'Rippling',
    shortName: 'Rippling',
    logo: 'https://img.logo.dev/rippling.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ&format=png&retina=true',
  },
  jumpcloud: {
    name: 'JumpCloud',
    shortName: 'JumpCloud',
    logo: 'https://img.logo.dev/jumpcloud.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ&format=png&retina=true',
  },
} as const;

export const useEmployeeSync = ({
  organizationId,
  initialData,
}: UseEmployeeSyncOptions): UseEmployeeSyncReturn => {
  const [isSyncing, setIsSyncing] = useState(false);

  const { data, mutate } = useSWR<EmployeeSyncConnectionsData>(
    ['employee-sync-connections', organizationId],
    null, // No fetcher - we only update via mutate
    { fallbackData: initialData, revalidateOnFocus: false, revalidateOnMount: false },
  );

  const googleWorkspaceConnectionId = data?.googleWorkspaceConnectionId ?? null;
  const ripplingConnectionId = data?.ripplingConnectionId ?? null;
  const jumpcloudConnectionId = data?.jumpcloudConnectionId ?? null;
  const selectedProvider = data?.selectedProvider ?? null;

  const setSyncProvider = async (provider: SyncProvider | null) => {
    try {
      await apiClient.post(
        `/v1/integrations/sync/employee-sync-provider?organizationId=${organizationId}`,
        { provider },
      );

      // Update cache optimistically
      mutate({ ...data!, selectedProvider: provider }, false);

      if (provider) {
        toast.success(`${PROVIDER_CONFIG[provider].name} set as your employee sync provider`);
      }
    } catch (error) {
      toast.error('Failed to set sync provider');
      throw error;
    }
  };

  const syncEmployees = async (provider: SyncProvider): Promise<SyncResult | null> => {
    const connectionId =
      provider === 'google-workspace'
        ? googleWorkspaceConnectionId
        : provider === 'rippling'
          ? ripplingConnectionId
          : jumpcloudConnectionId;

    if (!connectionId) {
      toast.error(`${PROVIDER_CONFIG[provider].name} is not connected`);
      return null;
    }

    setIsSyncing(true);
    const config = PROVIDER_CONFIG[provider];

    try {
      // Set as sync provider if not already
      if (selectedProvider !== provider) {
        await setSyncProvider(provider);
      }

      const response = await apiClient.post<SyncResult>(
        `/v1/integrations/sync/${provider}/employees?organizationId=${organizationId}&connectionId=${connectionId}`,
      );

      if (response.data?.success) {
        const { imported, reactivated, deactivated, skipped, errors } = response.data;

        if (imported > 0) {
          toast.success(`Imported ${imported} new employee${imported > 1 ? 's' : ''}`);
        }
        if (reactivated > 0) {
          toast.success(`Reactivated ${reactivated} employee${reactivated > 1 ? 's' : ''}`);
        }
        if (deactivated > 0) {
          toast.info(
            `Deactivated ${deactivated} employee${deactivated > 1 ? 's' : ''} (no longer in ${config.name})`,
          );
        }
        if (imported === 0 && reactivated === 0 && deactivated === 0 && skipped > 0) {
          toast.info('All employees are already synced');
        }
        if (errors > 0) {
          toast.warning(`${errors} employee${errors > 1 ? 's' : ''} failed to sync`);
        }

        return response.data;
      }

      if (response.error) {
        toast.error(response.error);
      }

      return null;
    } catch (error) {
      toast.error(`Failed to sync employees from ${config.name}`);
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const getProviderName = (provider: SyncProvider) => PROVIDER_CONFIG[provider].shortName;
  const getProviderLogo = (provider: SyncProvider) => PROVIDER_CONFIG[provider].logo;

  return {
    googleWorkspaceConnectionId,
    ripplingConnectionId,
    jumpcloudConnectionId,
    selectedProvider,
    isSyncing,
    syncEmployees,
    setSyncProvider,
    hasAnyConnection: !!(
      googleWorkspaceConnectionId ||
      ripplingConnectionId ||
      jumpcloudConnectionId
    ),
    getProviderName,
    getProviderLogo,
  };
};
