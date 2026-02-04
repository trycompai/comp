import {
  emailOTPClient,
  magicLinkClient,
  multiSessionClient,
  organizationClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { ac, allRoles } from './permissions';

/**
 * Auth client for browser-side authentication.
 *
 * This client uses the app's own URL as the base, which routes through the
 * auth proxy at /api/auth/[...all]. This ensures cookies are set for the
 * correct domain (the app's domain).
 *
 * For server-side session validation, use auth.ts instead.
 *
 * SECURITY NOTE: Authentication is handled via httpOnly cookies set by the API.
 * We do not store tokens in localStorage to prevent XSS attacks.
 */

// Use empty string for relative URLs - this makes all auth requests go through
// the app's own /api/auth/* routes, which proxy to the API server.
// This ensures cookies are set for the app's domain, not the API's domain.
const BASE_URL = '';

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  plugins: [
    organizationClient({
      ac,
      roles: allRoles,
    }),
    emailOTPClient(),
    magicLinkClient(),
    multiSessionClient(),
  ],
  // Authentication is handled via httpOnly cookies - no localStorage tokens needed
});

export const {
  signIn,
  signOut,
  useSession,
  useActiveOrganization,
  organization,
  useListOrganizations,
  useActiveMember,
} = authClient;
