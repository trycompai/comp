import {
  emailOTPClient,
  multiSessionClient,
  organizationClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { ac, allRoles } from '@comp/auth';

export const authClient = createAuthClient({
  // Empty baseURL = calls go through the portal's own /api/auth/* proxy
  baseURL: '',
  plugins: [
    organizationClient({ ac, roles: allRoles }),
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
