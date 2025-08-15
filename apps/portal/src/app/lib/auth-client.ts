import {
  emailOTPClient,
  inferAdditionalFields,
  multiSessionClient,
  organizationClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { auth } from './auth';

console.log('process.env.NEXT_PUBLIC_BETTER_AUTH_URL', process.env.NEXT_PUBLIC_BETTER_AUTH_URL);

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [
    organizationClient(),
    inferAdditionalFields<typeof auth>(),
    emailOTPClient(),
    multiSessionClient(),
  ],
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
