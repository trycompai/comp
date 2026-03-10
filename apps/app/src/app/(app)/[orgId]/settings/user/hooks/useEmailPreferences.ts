'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

interface EmailPreferences {
  policyNotifications: boolean;
  taskReminders: boolean;
  weeklyTaskDigest: boolean;
  unassignedItemsNotifications: boolean;
  taskMentions: boolean;
  taskAssignments: boolean;
}

export const emailPreferencesKey = () =>
  ['/v1/people/me/email-preferences'] as const;

interface UseEmailPreferencesOptions {
  initialPreferences?: EmailPreferences;
}

export function useEmailPreferences(options?: UseEmailPreferencesOptions) {
  const { initialPreferences } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR(
    emailPreferencesKey(),
    async () => {
      const response = await apiClient.get<{
        preferences: EmailPreferences;
      }>('/v1/people/me/email-preferences');
      if (response.error) throw new Error(response.error);
      return response.data?.preferences ?? null;
    },
    {
      fallbackData: initialPreferences,
      revalidateOnMount: !initialPreferences,
      revalidateOnFocus: false,
    },
  );

  const savePreferences = async (preferences: EmailPreferences) => {
    // Optimistic update
    await mutate(preferences, false);

    try {
      const response = await apiClient.put(
        '/v1/people/me/email-preferences',
        { preferences },
      );
      if (response.error) throw new Error(response.error);
      await mutate();
    } catch (err) {
      // Rollback
      await mutate(initialPreferences, false);
      throw err;
    }
  };

  return {
    preferences: data ?? initialPreferences ?? null,
    isLoading: isLoading && !data,
    error,
    mutate,
    savePreferences,
  };
}
