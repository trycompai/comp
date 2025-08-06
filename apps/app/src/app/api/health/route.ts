import { db } from '@db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test database connection
    const userCount = await db.user.count();

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      userCount,
      env: {
        E2E_TEST_MODE: process.env.E2E_TEST_MODE,
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set',
        AUTH_SECRET: process.env.AUTH_SECRET ? 'set' : 'not set',
        NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'not set',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
