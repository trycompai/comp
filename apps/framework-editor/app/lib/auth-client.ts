/**
 * Auth client for browser-side authentication.
 *
 * Points directly at the NestJS API where better-auth runs.
 * Cross-subdomain cookies (.trycomp.ai) handle session sharing.
 */
import { createAuthClient } from 'better-auth/react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export const authClient = createAuthClient({
  baseURL: BASE_URL,
});

export const { signIn, signOut, useSession } = authClient;
