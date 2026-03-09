'use client';

import useSWR from 'swr';
import { useActiveMember } from '@/utils/auth-client';
import { apiClient } from '@/lib/api-client';
import {
  resolveBuiltInPermissions,
  mergePermissions,
  hasPermission,
  type UserPermissions,
} from '@/lib/permissions';

interface CustomRolePermissionsResponse {
  permissions: Record<string, string[]>;
}

export function usePermissions() {
  const { data: activeMember } = useActiveMember();
  const roleString = activeMember?.role ?? null;

  // Resolve built-in roles synchronously
  const { permissions: builtInPerms, customRoleNames } =
    resolveBuiltInPermissions(roleString);

  // Fetch custom role permissions if needed (SWR-cached)
  const { data: customPermsData } = useSWR(
    customRoleNames.length > 0
      ? ['/v1/roles/permissions', ...customRoleNames]
      : null,
    async () => {
      const res = await apiClient.get<CustomRolePermissionsResponse>(
        `/v1/roles/permissions?roles=${customRoleNames.join(',')}`,
      );
      return res.data?.permissions ?? {};
    },
    { revalidateOnFocus: false },
  );

  // Merge built-in + custom
  const permissions: UserPermissions = { ...builtInPerms };
  // Deep-copy arrays so mergePermissions doesn't mutate builtInPerms
  for (const key of Object.keys(permissions)) {
    permissions[key] = [...permissions[key]];
  }
  if (customPermsData) {
    mergePermissions(permissions, customPermsData);
  }

  return {
    permissions,
    hasPermission: (resource: string, action: string) =>
      hasPermission(permissions, resource, action),
  };
}
