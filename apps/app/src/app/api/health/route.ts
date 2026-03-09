import { db } from '@db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test database connection
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'error' },
      { status: 500 },
    );
  }
}
