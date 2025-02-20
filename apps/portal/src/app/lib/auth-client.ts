import { env } from "@/env.mjs"
import { createAuthClient } from "better-auth/client"
import { emailOTPClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseUrl: env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [
    emailOTPClient()
  ],
});
