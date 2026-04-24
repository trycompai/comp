import { auth } from '../auth/auth.server';

/** One year in milliseconds. */
export const DEVICE_AGENT_SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export interface CreatedDeviceAgentSession {
  sessionId: string;
  token: string;
  expiresAt: Date;
}

/**
 * Create a dedicated long-lived session for a device agent.
 *
 * Delegates to better-auth's internal session adapter so `databaseHooks`,
 * the organization plugin's `activeOrganizationId` setter, multiSession
 * tracking, and any secondary storage all run as they do for normal logins.
 *
 * We pass `overrideAll: true` because better-auth's default path in
 * internal-adapter.mjs explicitly overwrites `expiresAt` with the config
 * default unless `overrideAll` is set.
 */
export async function createDeviceAgentSession({
  userId,
}: {
  userId: string;
}): Promise<CreatedDeviceAgentSession> {
  const ctx = await auth.$context;
  const expiresAt = new Date(Date.now() + DEVICE_AGENT_SESSION_TTL_MS);

  const session = await ctx.internalAdapter.createSession(
    userId,
    false,
    { expiresAt, deviceAgent: true },
    true,
  );

  return {
    sessionId: session.id,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}
