import { client as kv } from '@comp/kv';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const exchangeCodeSchema = z.object({
  code: z.string().min(1),
});

interface StoredAuthCode {
  sessionToken: string;
  userId: string;
  state: string;
  createdAt: number;
}

/**
 * Exchanges a single-use authorization code for a session token.
 * No authentication required — the code itself is the proof of auth.
 * This follows the same pattern as OAuth authorization code exchange.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = exchangeCodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { code } = parsed.data;
    const kvKey = `device-auth:${code}`;

    // Fetch and immediately delete (single-use)
    const stored = await kv.get<StoredAuthCode>(kvKey);

    if (!stored) {
      return NextResponse.json(
        { error: 'Invalid or expired authorization code' },
        { status: 401 },
      );
    }

    // Delete immediately to prevent replay
    await kv.del(kvKey);

    return NextResponse.json({
      session_token: stored.sessionToken,
      user_id: stored.userId,
    });
  } catch (error) {
    console.error('Error exchanging device auth code:', error);
    return NextResponse.json({ error: 'Failed to exchange auth code' }, { status: 500 });
  }
}
