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
  canAccessAuditorView,
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
  const { permissions: builtInPerms } = resolveBuiltInPermissions(roleString);

  // Resolve built-in obligations synchronously — used as the initial value
  // until the server returns the effective obligations (which include any
  // per-organization overrides on the built-in roles).
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

  // Query the resolver for all role names — custom roles contribute
  // permissions, and built-in roles may carry a per-org obligation override.
  const { data: customData } = useSWR(
    roleNames.length > 0 ? ['/v1/roles/permissions', ...roleNames] : null,
    async () => {
      const res = await apiClient.get<CustomRolePermissionsResponse>(
        `/v1/roles/permissions?roles=${roleNames.join(',')}`,
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

  // Once the server response arrives it represents the effective obligations
  // (defaults merged with any overrides). Before it arrives, fall back to the
  // synchronous built-in defaults so initial render is correct for the common
  // case (no overrides).
  const obligations: Record<string, boolean> = customData?.obligations
    ? Object.fromEntries(
        Object.entries(customData.obligations).filter(([, val]) => val),
      )
    : { ...builtInObligations };

  // CS-189: separate "did a custom role grant this permission" from the
  // merged permissions, so the Auditor View visibility check can distinguish
  // an owner's implicit audit:read from a custom role's explicit audit:read.
  const customPermissions = customData?.permissions ?? {};

  return {
    permissions,
    customPermissions,
    obligations,
    roles: roleNames,
    hasPermission: (resource: string, action: string) =>
      hasPermission(permissions, resource, action),
    canAccessAuditorView: canAccessAuditorView(roleString, customPermissions),
  };
}
