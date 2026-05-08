'use client';

import { apiClient } from '@/lib/api-client';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

export interface DeviceSyncProviderInfo {
  slug: string;
  name: string;
  logoUrl: string;
  connected: boolean;
  connectionId: string | null;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
}

interface DeviceSyncResult {
  success: boolean;
  totalFound: number;
  imported: number;
  updated: number;
  skipped: number;
  removed: number;
  errors: number;
}

interface UseDeviceSyncOptions {
  organizationId: string;
}

interface UseDeviceSyncReturn {
  selectedProvider: string | null;
  isSyncing: boolean;
  isLoading: boolean;
  availableProviders: DeviceSyncProviderInfo[];
  syncDevices: (provider: string) => Promise<DeviceSyncResult | null>;
  setSyncProvider: (provider: string | null) => Promise<void>;
  getProviderName: (provider: string) => string;
  getProviderLogo: (provider: string) => string;
  hasAnyConnection: boolean;
}

export function useDeviceSync({ organizationId }: UseDeviceSyncOptions): UseDeviceSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch current device sync provider
  const { data: providerData, mutate: mutateProvider } = useSWR<{ provider: string | null }>(
    `/v1/integrations/sync/device-sync-provider?organizationId=${organizationId}`,
    async (url: string) => {
      const res = await apiClient.get<{ provider: string | null }>(url);
      if (res.error) throw new Error(res.error);
      return res.data as { provider: string | null };
    },
  );

  // Fetch available device sync providers
  const { data: availableData, isLoading } = useSWR<{ providers: DeviceSyncProviderInfo[] }>(
    `/v1/integrations/sync/available-providers?organizationId=${organizationId}&syncType=device`,
    async (url: string) => {
      const res = await apiClient.get<{ providers: DeviceSyncProviderInfo[] }>(url);
      if (res.error) throw new Error(res.error);
      return res.data as { providers: DeviceSyncProviderInfo[] };
    },
  );

  const selectedProvider = providerData?.provider ?? null;
  const availableProviders = Array.isArray(availableData?.providers)
    ? availableData.providers
    : [];

  const getProviderName = (provider: string): string => {
    return availableProviders.find((p) => p.slug === provider)?.name ?? provider;
  };

  const getProviderLogo = (provider: string): string => {
    return availableProviders.find((p) => p.slug === provider)?.logoUrl ?? '';
  };

  const setSyncProvider = async (provider: string | null) => {
    try {
      const response = await apiClient.post(
        `/v1/integrations/sync/device-sync-provider?organizationId=${organizationId}`,
        { provider },
      );

      if (response.error) {
        toast.error('Failed to set device sync provider');
        return;
      }

      mutateProvider({ provider }, false);

      if (provider) {
        const name = getProviderName(provider);
        toast.success(`${name} set as your device sync provider`);
      }
    } catch {
      toast.error('Failed to set device sync provider');
    }
  };

  const syncDevices = async (provider: string): Promise<DeviceSyncResult | null> => {
    const providerInfo = availableProviders.find((p) => p.slug === provider);
    const connId = providerInfo?.connectionId;

    if (!connId) {
      toast.error(`${getProviderName(provider)} is not connected`);
      return null;
    }

    setIsSyncing(true);
    const providerName = getProviderName(provider);

    try {
      if (selectedProvider !== provider) {
        await setSyncProvider(provider);
      }

      const response = await apiClient.post<DeviceSyncResult>(
        `/v1/integrations/sync/dynamic/${provider}/devices?organizationId=${organizationId}&connectionId=${connId}`,
      );

      if (response.data?.success) {
        const { imported, updated, removed, skipped, errors } = response.data;
        const parts: string[] = [];
        if (imported > 0) parts.push(`${imported} new`);
        if (updated > 0) parts.push(`${updated} updated`);
        if (removed > 0) parts.push(`${removed} removed`);
        if (skipped > 0) parts.push(`${skipped} skipped`);

        if (parts.length > 0) {
          toast.success(`Synced ${response.data.totalFound} devices — ${parts.join(', ')}`);
        } else {
          toast.info('All devices are already synced');
        }

        if (errors > 0) {
          toast.warning(`${errors} device${errors > 1 ? 's' : ''} failed to sync`);
        }

        return response.data;
      }

      if (response.error) {
        toast.error(response.error);
      }

      return null;
    } catch {
      toast.error(`Failed to sync devices from ${providerName}`);
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    selectedProvider,
    isSyncing,
    isLoading,
    availableProviders,
    syncDevices,
    setSyncProvider,
    getProviderName,
    getProviderLogo,
    hasAnyConnection: availableProviders.some((p) => p.connected),
  };
}
