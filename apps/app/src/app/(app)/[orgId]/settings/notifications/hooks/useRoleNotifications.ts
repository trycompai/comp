'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';
import type { RoleNotificationConfig } from '../data/getRoleNotificationSettings';

interface RoleNotificationsResponse {
  data: RoleNotificationConfig[];
}

export const roleNotificationsKey = () =>
  ['/v1/organization/role-notifications'] as const;

interface UseRoleNotificationsOptions {
  initialData?: RoleNotificationConfig[];
}

export function useRoleNotifications(options?: UseRoleNotificationsOptions) {
  const { initialData } = options ?? {};

  const { data, error, isLoading, mutate } = useSWR(
    roleNotificationsKey(),
    async () => {
      const response = await apiClient.get<RoleNotificationsResponse>(
        '/v1/organization/role-notifications',
      );
      if (response.error) throw new Error(response.error);
      if (!response.data?.data) return [];
      return response.data.data;
    },
    {
      fallbackData: initialData,
      revalidateOnMount: !initialData,
      revalidateOnFocus: false,
    },
  );

  const settings = Array.isArray(data) ? data : [];

  const saveSettings = async (updatedSettings: RoleNotificationConfig[]) => {
    const response = await apiClient.put(
      '/v1/organization/role-notifications',
      {
        settings: updatedSettings.map((config) => ({
          role: config.role,
          ...config.notifications,
        })),
      },
    );
    if (response.error) throw new Error(response.error);
    await mutate(updatedSettings, false);
    await mutate();
  };

  return {
    settings,
    isLoading: isLoading && !data,
    error,
    mutate,
    saveSettings,
  };
}
