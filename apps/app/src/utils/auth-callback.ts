/**
 * Validates that a redirect path is safe (no open redirect vulnerabilities).
 */
export const isValidRedirectPath = (path?: string | null): path is string => {
  if (!path || typeof path !== 'string') {
    return false;
  }

  if (!path.startsWith('/') || path.startsWith('//')) {
    return false;
  }

  return !path.includes('://');
};

/**
 * Returns the path if valid, undefined otherwise.
 */
export const getSafeRedirectPath = (path?: string | null): string | undefined => {
  return isValidRedirectPath(path) ? path : undefined;
};

/**
 * Builds the auth callback URL for sign-in flows.
 *
 * Priority:
 * 1. If inviteCode is provided, redirect to /invite/{code}
 * 2. If redirectTo is provided and valid, use it
 * 3. Otherwise, redirect to /
 */
export const buildAuthCallbackUrl = (options?: {
  inviteCode?: string;
  redirectTo?: string;
}): string => {
  const { inviteCode, redirectTo } = options ?? {};

  // Invite code takes priority
  if (inviteCode) {
    return `/invite/${inviteCode}`;
  }

  // Use redirectTo if valid
  const safeRedirect = getSafeRedirectPath(redirectTo);
  if (safeRedirect) {
    return safeRedirect;
  }

  // Default to root
  return '/';
};
