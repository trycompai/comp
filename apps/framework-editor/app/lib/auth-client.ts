/**
 * Auth client for browser-side authentication.
 *
 * Points to the framework-editor's own origin so requests stay same-origin
 * (no CORS). The /api/auth/[...all] proxy route forwards to the API server.
 */
import { createAuthClient } from 'better-auth/react';

const BASE_URL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3004';

export const authClient = createAuthClient({
  baseURL: BASE_URL,
});

export const { signIn, signOut, useSession } = authClient;
