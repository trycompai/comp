'use client';

import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import useSWR from 'swr';

export interface TwoFactorSourceProviderInfo {
  slug: string;
  name: string;
  logoUrl: string | null;
  connected: boolean;
  connectionId: string | null;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
}

interface Use2faSourceOptions {
  organizationId: string;
  /**
   * When false, the hook makes no API calls (used to fully disable it for users
   * who lack the integration:update permission, so no 2FA-source API is hit).
   */
  enabled?: boolean;
}

interface Use2faSourceReturn {
  selectedSource: string | null;
  isLoading: boolean;
  error?: string;
  availableSources: TwoFactorSourceProviderInfo[];
  setSource: (provider: string | null) => Promise<boolean>;
  hasAnyConnection: boolean;
}

/**
 * The org's 2FA source: which connected integration (bound to the 2FA evidence
 * task) supplies the per-employee 2FA column on the People tab.
 */
export function use2faSource({
  organizationId,
  enabled = true,
}: Use2faSourceOptions): Use2faSourceReturn {
  const {
    data: sourceData,
    error: sourceError,
    isLoading: isLoadingSource,
    mutate: mutateSource,
  } = useSWR<{ provider: string | null }>(
    enabled
      ? `/v1/integrations/sync/two-factor-source?organizationId=${organizationId}`
      : null,
    async (url: string) => {
      const res = await apiClient.get<{ provider: string | null }>(url);
      if (res.error) throw new Error(res.error);
      return res.data as { provider: string | null };
    },
    { revalidateOnFocus: false },
  );

  const {
    data: availableData,
    error: availableError,
    isLoading: isLoadingAvailable,
  } = useSWR<{ providers: TwoFactorSourceProviderInfo[] }>(
    enabled
      ? `/v1/integrations/sync/available-2fa-sources?organizationId=${organizationId}`
      : null,
    async (url: string) => {
      const res = await apiClient.get<{
        providers: TwoFactorSourceProviderInfo[];
      }>(url);
      if (res.error) throw new Error(res.error);
      return res.data as { providers: TwoFactorSourceProviderInfo[] };
    },
    { revalidateOnFocus: false },
  );

  const selectedSource = sourceData?.provider ?? null;
  const availableSources = Array.isArray(availableData?.providers)
    ? availableData.providers
    : [];

  const setSource = async (provider: string | null): Promise<boolean> => {
    try {
      const response = await apiClient.post(
        `/v1/integrations/sync/two-factor-source?organizationId=${organizationId}`,
        { provider },
      );
      if (response.error) {
        toast.error('Failed to set 2FA source');
        return false;
      }

      mutateSource({ provider }, false);

      if (provider) {
        const name =
          availableSources.find((p) => p.slug === provider)?.name ?? provider;
        toast.success(`${name} set as your 2FA source`);
      }
      return true;
    } catch {
      toast.error('Failed to set 2FA source');
      return false;
    }
  };

  const fetchError = sourceError ?? availableError;

  return {
    selectedSource,
    // Both requests feed the selector; report loading until BOTH settle so
    // consumers never render a half-resolved state (e.g. sources without the
    // current selection).
    isLoading: isLoadingSource || isLoadingAvailable,
    error: fetchError instanceof Error ? fetchError.message : undefined,
    availableSources,
    setSource,
    hasAnyConnection: availableSources.some((p) => p.connected),
  };
}
