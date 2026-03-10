import { auth } from '@/app/lib/auth';
import { client as kv } from '@comp/kv';
import { randomBytes } from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const authCodeSchema = z.object({
  callback_port: z.number().int().min(1).max(65535),
  state: z.string().min(1),
});

/**
 * Generates a short-lived authorization code for the device agent.
 * Called by the portal frontend after successful login when device_auth=true.
 * The code can be exchanged for a session token via /api/device-agent/exchange-code.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = authCodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { state } = parsed.data;

    // Use the raw session token from the database (not the signed cookie value).
    // The bearer plugin expects the raw token and signs it internally.
    const sessionToken = session.session.token;

    // Generate a single-use authorization code
    const code = randomBytes(32).toString('hex');

    // Store in KV with 2-minute expiry
    await kv.set(
      `device-auth:${code}`,
      {
        sessionToken,
        userId: session.user.id,
        state,
        createdAt: Date.now(),
      },
      { ex: 120 },
    );

    return NextResponse.json({ code });
  } catch (error) {
    console.error('Error generating device auth code:', error);
    return NextResponse.json({ error: 'Failed to generate auth code' }, { status: 500 });
  }
}
