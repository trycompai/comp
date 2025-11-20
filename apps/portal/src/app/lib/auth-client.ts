import {
  emailOTPClient,
  multiSessionClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

console.log(
  "process.env.NEXT_PUBLIC_BETTER_AUTH_URL",
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL
);

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [organizationClient({}), emailOTPClient(), multiSessionClient()],
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
