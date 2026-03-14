import type { AuthContext } from '../auth/types';

export interface AdminRequest {
  userId: string;
}

/**
 * Build an AuthContext for platform admin operations that delegate to
 * org-scoped services requiring an auth context.
 *
 * The context uses the org-level 'admin' role (not 'owner') so the
 * platform admin sees the same data an org admin would. The
 * `isPlatformAdmin` flag is set so services can distinguish this from
 * a real org member if needed.
 */
export function buildPlatformAdminAuthContext(
  userId: string,
  organizationId: string,
): AuthContext {
  return {
    userId,
    organizationId,
    userRoles: ['admin'],
    isPlatformAdmin: true,
    isApiKey: false,
    authType: 'session',
  };
}
