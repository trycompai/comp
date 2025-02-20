import { env } from "@/env.mjs";
import { createAuthClient } from "better-auth/client";
import { customSessionClient, emailOTPClient } from "better-auth/client/plugins";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseUrl: env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [
    emailOTPClient(),
    customSessionClient(),
    inferAdditionalFields({
      user: {
        organizationId: {
          type: "string",
          required: false,
          nullabe: true,
        },
        organization: {
          type: "string",
          required: false,
          nullabe: true,
        },
      },
    }),
  ],
});

export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
