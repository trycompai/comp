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
  /**
   * When false, the hook makes no API calls (used to fully disable it for users
   * who lack the integration:update permission, so no device-sync API is hit).
   */
  enabled?: boolean;
}

interface UseDeviceSyncReturn {
  selectedProvider: string | null;
  isSyncing: boolean;
  isLoading: boolean;
  availableProviders: DeviceSyncProviderInfo[];
  syncDevices: (provider: string) => Promise<DeviceSyncResult | null>;
  setSyncProvider: (provider: string | null) => Promise<boolean>;
  getProviderName: (provider: string) => string;
  getProviderLogo: (provider: string) => string;
  hasAnyConnection: boolean;
}

export function useDeviceSync({
  organizationId,
  enabled = true,
}: UseDeviceSyncOptions): UseDeviceSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch current device sync provider
  const { data: providerData, mutate: mutateProvider } = useSWR<{ provider: string | null }>(
    enabled
      ? `/v1/integrations/sync/device-sync-provider?organizationId=${organizationId}`
      : null,
    async (url: string) => {
      const res = await apiClient.get<{ provider: string | null }>(url);
      if (res.error) throw new Error(res.error);
      return res.data as { provider: string | null };
    },
  );

  // Fetch available device sync providers
  const { data: availableData, isLoading, mutate: mutateAvailable } = useSWR<{ providers: DeviceSyncProviderInfo[] }>(
    enabled
      ? `/v1/integrations/sync/available-providers?organizationId=${organizationId}&syncType=device`
      : null,
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

  const setSyncProvider = async (provider: string | null): Promise<boolean> => {
    try {
      const response = await apiClient.post(
        `/v1/integrations/sync/device-sync-provider?organizationId=${organizationId}`,
        { provider },
      );

      if (response.error) {
        toast.error('Failed to set device sync provider');
        return false;
      }

      mutateProvider({ provider }, false);

      if (provider) {
        const name = getProviderName(provider);
        toast.success(`${name} set as your device sync provider`);
      }
      return true;
    } catch {
      toast.error('Failed to set device sync provider');
      return false;
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
        // Don't sync with a stale provider config if persisting the choice failed.
        const providerSet = await setSyncProvider(provider);
        if (!providerSet) {
          return null;
        }
      }

      const response = await apiClient.post<DeviceSyncResult>(
        `/v1/integrations/sync/dynamic/${provider}/devices?organizationId=${organizationId}&connectionId=${connId}`,
      );

      // Branch on the presence of a result body, NOT on `success`: a partial
      // sync returns HTTP 200 with success=false (errors > 0) but still imports
      // some devices — we must surface both the summary and the warning.
      if (response.data) {
        // The sync updated connection.lastSyncAt server-side; revalidate so the
        // selector's "Last synced" reflects it instead of staying stale.
        void mutateAvailable();
        const { totalFound, imported, updated, removed, skipped, errors } =
          response.data;
        const parts: string[] = [];
        if (imported > 0) parts.push(`${imported} new`);
        if (updated > 0) parts.push(`${updated} updated`);
        if (removed > 0) parts.push(`${removed} removed`);
        if (skipped > 0) parts.push(`${skipped} skipped`);

        if (parts.length > 0) {
          toast.success(`Synced ${totalFound} devices — ${parts.join(', ')}`);
        } else if (errors === 0) {
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
