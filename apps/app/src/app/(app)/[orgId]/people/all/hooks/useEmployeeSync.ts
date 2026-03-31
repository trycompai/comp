'use client';

import { apiClient } from '@/lib/api-client';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

import type { EmployeeSyncConnectionsData, SyncProviderInfo } from '../data/queries';

type BuiltInSyncProvider = 'google-workspace' | 'rippling' | 'jumpcloud' | 'ramp';
type SyncProvider = string;

interface SyncResult {
  success: boolean;
  requiresRoleMapping?: boolean;
  totalFound: number;
  imported: number;
  updated: number;
  reactivated: number;
  deactivated: number;
  skipped: number;
  errors: number;
}

interface DiscoveredRole {
  role: string;
  userCount: number;
}

interface RoleMappingEntry {
  rampRole: string;
  compRole: string;
  isBuiltIn: boolean;
  permissions?: Record<string, string[]>;
  obligations?: Record<string, boolean>;
}

export interface RoleMappingData {
  discoveredRoles: DiscoveredRole[];
  defaultMapping: RoleMappingEntry[];
  existingMapping: RoleMappingEntry[] | null;
  existingCustomRoles: Array<{
    name: string;
    permissions: Record<string, string[]>;
    obligations: Record<string, boolean>;
  }>;
  connectionId: string;
}

interface UseEmployeeSyncOptions {
  organizationId: string;
  initialData: EmployeeSyncConnectionsData;
}

interface UseEmployeeSyncReturn {
  googleWorkspaceConnectionId: string | null;
  ripplingConnectionId: string | null;
  jumpcloudConnectionId: string | null;
  rampConnectionId: string | null;
  selectedProvider: SyncProvider | null;
  isSyncing: boolean;
  syncEmployees: (provider: SyncProvider) => Promise<SyncResult | null>;
  setSyncProvider: (provider: SyncProvider | null) => Promise<void>;
  hasAnyConnection: boolean;
  getProviderName: (provider: SyncProvider) => string;
  getProviderLogo: (provider: SyncProvider) => string;
  showRoleMappingSheet: boolean;
  roleMappingData: RoleMappingData | null;
  handleRoleMappingClose: () => void;
  handleRoleMappingSaved: () => void;
  openRoleMappingEditor: () => Promise<void>;
  /** All available sync providers (built-in + dynamic) */
  availableProviders: SyncProviderInfo[];
}

const BUILT_IN_PROVIDERS = new Set<string>([
  'google-workspace',
  'rippling',
  'jumpcloud',
  'ramp',
]);

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
  ramp: {
    name: 'Ramp',
    shortName: 'Ramp',
    logo: 'https://img.logo.dev/ramp.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ&format=png&retina=true',
  },
} as const;

export const useEmployeeSync = ({
  organizationId,
  initialData,
}: UseEmployeeSyncOptions): UseEmployeeSyncReturn => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showRoleMappingSheet, setShowRoleMappingSheet] = useState(false);
  const [roleMappingData, setRoleMappingData] = useState<RoleMappingData | null>(null);
  const [pendingSyncProvider, setPendingSyncProvider] = useState<SyncProvider | null>(null);

  const { data, mutate } = useSWR<EmployeeSyncConnectionsData>(
    ['employee-sync-connections', organizationId],
    null, // No fetcher - we only update via mutate
    { fallbackData: initialData, revalidateOnFocus: false, revalidateOnMount: false },
  );

  const googleWorkspaceConnectionId = data?.googleWorkspaceConnectionId ?? null;
  const ripplingConnectionId = data?.ripplingConnectionId ?? null;
  const jumpcloudConnectionId = data?.jumpcloudConnectionId ?? null;
  const rampConnectionId = data?.rampConnectionId ?? null;
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
        const name = provider in PROVIDER_CONFIG
          ? PROVIDER_CONFIG[provider as BuiltInSyncProvider].name
          : (availableProviders.find((p) => p.slug === provider)?.name ?? provider);
        toast.success(`${name} set as your employee sync provider`);
      }
    } catch (error) {
      toast.error('Failed to set sync provider');
      throw error;
    }
  };

  const availableProviders = data?.availableProviders ?? [];

  const getConnectionIdForProvider = (provider: SyncProvider): string | null => {
    if (provider === 'google-workspace') return googleWorkspaceConnectionId;
    if (provider === 'rippling') return ripplingConnectionId;
    if (provider === 'jumpcloud') return jumpcloudConnectionId;
    if (provider === 'ramp') return rampConnectionId;
    // Dynamic provider — look up from availableProviders
    const dynProvider = availableProviders.find((p) => p.slug === provider);
    return dynProvider?.connectionId ?? null;
  };

  const getSyncUrl = (provider: SyncProvider, connectionId: string): string => {
    if (BUILT_IN_PROVIDERS.has(provider)) {
      return `/v1/integrations/sync/${provider}/employees?organizationId=${organizationId}&connectionId=${connectionId}`;
    }
    return `/v1/integrations/sync/dynamic/${provider}/employees?organizationId=${organizationId}&connectionId=${connectionId}`;
  };

  const syncEmployees = async (provider: SyncProvider): Promise<SyncResult | null> => {
    const connectionId = getConnectionIdForProvider(provider);

    if (!connectionId) {
      const providerName = getProviderName(provider);
      toast.error(`${providerName} is not connected`);
      return null;
    }

    setIsSyncing(true);
    const providerName = getProviderName(provider);

    try {
      // Set as sync provider if not already
      if (selectedProvider !== provider) {
        await setSyncProvider(provider);
      }

      const response = await apiClient.post<SyncResult>(
        getSyncUrl(provider, connectionId),
      );

      // Handle role mapping requirement (Ramp only)
      if (response.data?.requiresRoleMapping && provider === 'ramp' && connectionId) {
        setPendingSyncProvider(provider);
        try {
          const discoverResponse = await apiClient.post<{
            discoveredRoles: DiscoveredRole[];
            defaultMapping: RoleMappingEntry[];
            existingMapping: RoleMappingEntry[] | null;
            existingCustomRoles: Array<{
              name: string;
              permissions: Record<string, string[]>;
              obligations: Record<string, boolean>;
            }>;
          }>(
            `/v1/integrations/sync/ramp/discover-roles?organizationId=${organizationId}&connectionId=${connectionId}`,
          );

          if (discoverResponse.data) {
            setRoleMappingData({
              ...discoverResponse.data,
              connectionId,
            });
            setShowRoleMappingSheet(true);
          }
        } catch {
          toast.error('Failed to discover Ramp roles');
        }
        return null;
      }

      if (response.data?.success) {
        const { imported, updated, reactivated, deactivated, skipped, errors } = response.data;

        if (imported > 0) {
          toast.success(`Imported ${imported} new employee${imported > 1 ? 's' : ''}`);
        }
        if (updated > 0) {
          toast.success(`Updated roles for ${updated} employee${updated > 1 ? 's' : ''}`);
        }
        if (reactivated > 0) {
          toast.success(`Reactivated ${reactivated} employee${reactivated > 1 ? 's' : ''}`);
        }
        if (deactivated > 0) {
          toast.info(
            `Deactivated ${deactivated} employee${deactivated > 1 ? 's' : ''} (no longer in ${providerName})`,
          );
        }
        if (imported === 0 && updated === 0 && reactivated === 0 && deactivated === 0 && skipped > 0) {
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
      toast.error(`Failed to sync employees from ${providerName}`);
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const getProviderName = (provider: SyncProvider): string => {
    if (provider in PROVIDER_CONFIG) {
      return PROVIDER_CONFIG[provider as BuiltInSyncProvider].shortName;
    }
    const dynProvider = availableProviders.find((p) => p.slug === provider);
    return dynProvider?.name ?? provider;
  };
  const getProviderLogo = (provider: SyncProvider): string => {
    if (provider in PROVIDER_CONFIG) {
      return PROVIDER_CONFIG[provider as BuiltInSyncProvider].logo;
    }
    const dynProvider = availableProviders.find((p) => p.slug === provider);
    return dynProvider?.logoUrl ?? '';
  };

  const openRoleMappingEditor = async () => {
    if (!rampConnectionId) {
      toast.error('Ramp is not connected');
      return;
    }

    try {
      const discoverResponse = await apiClient.post<{
        discoveredRoles: DiscoveredRole[];
        defaultMapping: RoleMappingEntry[];
        existingMapping: RoleMappingEntry[] | null;
        existingCustomRoles: Array<{
          name: string;
          permissions: Record<string, string[]>;
          obligations: Record<string, boolean>;
        }>;
      }>(
        `/v1/integrations/sync/ramp/discover-roles?organizationId=${organizationId}&connectionId=${rampConnectionId}`,
      );

      if (discoverResponse.data) {
        setRoleMappingData({
          ...discoverResponse.data,
          connectionId: rampConnectionId,
        });
        setShowRoleMappingSheet(true);
      }
    } catch {
      toast.error('Failed to load role mapping');
    }
  };

  const handleRoleMappingClose = () => {
    setShowRoleMappingSheet(false);
    setRoleMappingData(null);
    setPendingSyncProvider(null);
    setIsSyncing(false);
  };

  const handleRoleMappingSaved = () => {
    setShowRoleMappingSheet(false);
    setRoleMappingData(null);

    // Retry sync with the pending provider now that mapping is saved
    if (pendingSyncProvider) {
      const provider = pendingSyncProvider;
      setPendingSyncProvider(null);
      syncEmployees(provider);
    }
  };

  const hasAnyBuiltInConnection = !!(
    googleWorkspaceConnectionId ||
    ripplingConnectionId ||
    jumpcloudConnectionId ||
    rampConnectionId
  );
  const hasDynamicConnection = availableProviders.some(
    (p) => p.connected && !BUILT_IN_PROVIDERS.has(p.slug),
  );

  return {
    googleWorkspaceConnectionId,
    ripplingConnectionId,
    jumpcloudConnectionId,
    rampConnectionId,
    selectedProvider,
    isSyncing,
    syncEmployees,
    setSyncProvider,
    hasAnyConnection: hasAnyBuiltInConnection || hasDynamicConnection,
    getProviderName,
    getProviderLogo,
    showRoleMappingSheet,
    roleMappingData,
    handleRoleMappingClose,
    handleRoleMappingSaved,
    openRoleMappingEditor,
    availableProviders,
  };
};
