import { env } from '@/env.mjs';
import {
  emailOTPClient,
  jwtClient,
  magicLinkClient,
  multiSessionClient,
  organizationClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { ac, allRoles } from './permissions';

export const authClient = createAuthClient({
  // Canonical Better Auth server lives in apps/api (served from `${NEXT_PUBLIC_API_URL}/api/auth/*`)
  baseURL: env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? window.location.origin : ''),
  plugins: [
    organizationClient({
      ac,
      roles: allRoles,
    }),
    emailOTPClient(),
    magicLinkClient(),
    jwtClient(),
    multiSessionClient(),
  ],
  fetchOptions: {
    // Required for OAuth flows when auth server is on a different origin.
    credentials: 'include',
    onSuccess: (ctx) => {
      // JWT tokens are now managed by jwtManager for better expiry handling
      // Just log that we received tokens - jwtManager will handle storage
      const authToken = ctx.response.headers.get('set-auth-token');
      if (authToken) {
        console.log('🎯 Bearer token available in response');
      }

      const jwtToken = ctx.response.headers.get('set-auth-jwt');
      if (jwtToken) {
        console.log('🎯 JWT token available in response');
      }
    },
    auth: {
      type: 'Bearer',
      token: () => localStorage.getItem('bearer_token') || '',
    },
  },
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
