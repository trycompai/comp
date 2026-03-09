import { auth } from '@/app/lib/auth';
import { db } from '@db';
import type { NextRequest } from 'next/server';

interface DeviceAgentSession {
  user: { id: string; email: string; name: string };
}

/**
 * Resolves the authenticated user for device-agent endpoints.
 *
 * Supports two auth methods:
 *   1. Bearer token (device agent sends raw session token)
 *      — looked up directly in the DB, bypassing better-auth
 *   2. Cookie-based session (browser requests)
 *      — delegated to better-auth via the API proxy
 */
export async function getDeviceAgentSession(
  req: NextRequest,
): Promise<DeviceAgentSession | null> {
  const authHeader = req.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return resolveSessionFromToken(token);
  }

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return null;

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  };
}

async function resolveSessionFromToken(
  token: string,
): Promise<DeviceAgentSession | null> {
  const session = await db.session.findUnique({
    where: { token },
    select: {
      expiresAt: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return { user: session.user };
}
