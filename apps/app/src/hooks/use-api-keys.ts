"use client";

import { getApiKeysAction } from "@/actions/organization/get-api-keys-action";
import { useI18n } from "@/locales/client";
import { useCallback } from "react";
import useSWR from "swr";

export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
}

/**
 * Custom hook for fetching API keys
 */
export function useApiKeys() {
  const t = useI18n();

  // Fetcher function that calls the server action
  const fetcher = useCallback(async () => {
    const result = await getApiKeysAction();
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(t("settings.api_keys.fetch_error"));
  }, [t]);

  // Use SWR for data fetching with caching and revalidation
  const {
    data: apiKeys,
    error,
    isLoading,
    mutate,
  } = useSWR<ApiKey[]>("api-keys", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000, // 10 seconds
  });

  return {
    apiKeys: apiKeys || [],
    isLoading,
    error: error ? error.message : null,
    refresh: mutate,
  };
}
