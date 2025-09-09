'use client';

import { authClient } from '@/utils/auth-client';

export function useAuth() {
  // Use the Better Auth React hooks
  const { data: session, isPending: isLoading, error } = authClient.useSession();
  const { data: activeMember } = authClient.useActiveMember();

  // Helper function to parse comma-separated roles
  const getUserRoles = (roleString?: string | null): string[] => {
    if (!roleString) return [];
    return roleString.split(',').map((role) => role.trim());
  };

  const userRoles = getUserRoles(activeMember?.role);

  return {
    session,
    member: activeMember || null,
    user: session?.user || null,
    isLoading,
    error,
    isAuthenticated: !!session,
    isReadOnly: activeMember?.role === 'readonly',
    canWrite: activeMember?.role !== 'readonly',
    hasRole: (role: string) => userRoles.includes(role),
    hasAnyRole: (roles: string[]) => roles.some((role) => userRoles.includes(role)),
    userRoles, // Expose the parsed roles array
  };
}
