import {
  emailOTPClient,
  inferAdditionalFields,
  magicLinkClient,
  organizationClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { auth } from './auth';
import { ac, allRoles } from './permissions';

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      ac,
      roles: allRoles,
    }),
    inferAdditionalFields<typeof auth>(),
    emailOTPClient(),
    magicLinkClient(),
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
