import {
  emailOTPClient,
  inferAdditionalFields,
  jwtClient,
  magicLinkClient,
  multiSessionClient,
  organizationClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { auth } from './auth';
import { ac, allRoles } from './permissions';

// Log the actual base URL the client will use (handles build-time and runtime cases)

const resolvedBaseURL =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export const authClient = createAuthClient({
  baseURL: resolvedBaseURL,
  plugins: [
    organizationClient({
      ac,
      roles: allRoles,
    }),
    inferAdditionalFields<typeof auth>(),
    emailOTPClient(),
    magicLinkClient(),
    jwtClient(),
    multiSessionClient(),
  ],
  fetchOptions: {
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
