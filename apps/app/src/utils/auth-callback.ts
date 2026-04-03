/**
 * Validates that a redirect path is safe (no open redirect vulnerabilities).
 *
 * Only checks the path portion (before ?) to allow URLs in query params
 * like /dashboard?shareUrl=https://example.com
 */
export const isValidRedirectPath = (path?: string | null): path is string => {
  if (!path || typeof path !== 'string') {
    return false;
  }

  // Must start with single slash (relative path)
  if (!path.startsWith('/') || path.startsWith('//')) {
    return false;
  }

  // Only check the path portion (before query string) for protocol
  const pathWithoutQuery = path.split('?')[0];
  return !pathWithoutQuery.includes('://');
};

/**
 * Returns the path if valid, undefined otherwise.
 */
export const getSafeRedirectPath = (path?: string | null): string | undefined => {
  return isValidRedirectPath(path) ? path : undefined;
};

/**
 * Builds the auth callback URL for sign-in flows.
 * Returns absolute URLs so that OAuth callbacks redirect to the correct app
 * regardless of which server processes the OAuth flow.
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

  // Determine the base origin for absolute URLs
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Invite code takes priority
  if (inviteCode) {
    return `${origin}/invite/${inviteCode}`;
  }

  // Use redirectTo if valid
  const safeRedirect = getSafeRedirectPath(redirectTo);
  if (safeRedirect) {
    return `${origin}${safeRedirect}`;
  }

  // Default to root
  return `${origin}/`;
};
