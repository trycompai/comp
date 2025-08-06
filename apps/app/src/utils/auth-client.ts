import {
  emailOTPClient,
  inferAdditionalFields,
  jwtClient,
  magicLinkClient,
  organizationClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { auth } from './auth';
import { ac, allRoles } from './permissions';

console.log('process.env.NEXT_PUBLIC_BETTER_AUTH_URL', process.env.NEXT_PUBLIC_BETTER_AUTH_URL);

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [
    organizationClient({
      ac,
      roles: allRoles,
    }),
    inferAdditionalFields<typeof auth>(),
    emailOTPClient(),
    magicLinkClient(),
    jwtClient(),
  ],
  fetchOptions: {
    onSuccess: (ctx) => {
      // Store Bearer token for session-based auth
      const authToken = ctx.response.headers.get('set-auth-token');
      if (authToken) {
        localStorage.setItem('bearer_token', authToken);
        console.log('🎯 Bearer token captured and stored');
      }
      
      // Store JWT token for API authentication
      const jwtToken = ctx.response.headers.get('set-auth-jwt');
      if (jwtToken) {
        localStorage.setItem('bearer_token', jwtToken); // Use same key for simplicity
        console.log('🎯 JWT token captured and stored');
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
