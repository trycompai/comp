import { env } from '@/env.mjs';
import {
  emailOTPClient,
  jwtClient,
  multiSessionClient,
  organizationClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
  plugins: [organizationClient(), emailOTPClient(), jwtClient(), multiSessionClient()],
  fetchOptions: {
    // Required for OAuth flows when auth server is on a different origin (e.g. ngrok):
    // lets the browser accept Set-Cookie so the OAuth state cookie exists on callback.
    credentials: 'include',
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
