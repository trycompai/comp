'use client';

import useSWR from 'swr';
import { BUILT_IN_ROLE_OBLIGATIONS } from '@trycompai/auth';
import { useActiveMember } from '@/utils/auth-client';
import { apiClient } from '@/lib/api-client';
import {
  resolveBuiltInPermissions,
  mergePermissions,
  hasPermission,
  parseRolesString,
  isBuiltInRole,
  type UserPermissions,
} from '@/lib/permissions';

interface CustomRolePermissionsResponse {
  permissions: Record<string, string[]>;
  obligations?: Record<string, boolean>;
}

export function usePermissions() {
  const { data: activeMember } = useActiveMember();
  const roleString = activeMember?.role ?? null;

  // Resolve built-in roles synchronously
  const { permissions: builtInPerms, customRoleNames } =
    resolveBuiltInPermissions(roleString);

  // Resolve built-in obligations synchronously
  const roleNames = parseRolesString(roleString);
  const builtInObligations: Record<string, boolean> = {};
  for (const name of roleNames) {
    if (isBuiltInRole(name)) {
      const roleObligations = BUILT_IN_ROLE_OBLIGATIONS[name];
      if (roleObligations) {
        for (const [key, val] of Object.entries(roleObligations)) {
          if (val) builtInObligations[key] = true;
        }
      }
    }
  }

  // Fetch custom role permissions (and obligations) if needed (SWR-cached)
  const { data: customData } = useSWR(
    customRoleNames.length > 0
      ? ['/v1/roles/permissions', ...customRoleNames]
      : null,
    async () => {
      const res = await apiClient.get<CustomRolePermissionsResponse>(
        `/v1/roles/permissions?roles=${customRoleNames.join(',')}`,
      );
      return {
        permissions: res.data?.permissions ?? {},
        obligations: res.data?.obligations ?? {},
      };
    },
    { revalidateOnFocus: false },
  );

  // Merge built-in + custom permissions
  const permissions: UserPermissions = { ...builtInPerms };
  // Deep-copy arrays so mergePermissions doesn't mutate builtInPerms
  for (const key of Object.keys(permissions)) {
    permissions[key] = [...permissions[key]];
  }
  if (customData?.permissions) {
    mergePermissions(permissions, customData.permissions);
  }

  // Merge built-in + custom obligations
  const obligations: Record<string, boolean> = { ...builtInObligations };
  if (customData?.obligations) {
    for (const [key, val] of Object.entries(customData.obligations)) {
      if (val) obligations[key] = true;
    }
  }

  return {
    permissions,
    obligations,
    hasPermission: (resource: string, action: string) =>
      hasPermission(permissions, resource, action),
  };
}
