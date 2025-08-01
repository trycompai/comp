import { corsResponse, handleCorsPreflightRequest } from '@/lib/cors';
import { db } from '@db';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const userCount = await db.user.count();

    return corsResponse(
      {
        status: 'ok',
        database: 'connected',
        userCount,
        env: {
          E2E_TEST_MODE: process.env.E2E_TEST_MODE,
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set',
          AUTH_SECRET: process.env.AUTH_SECRET ? 'set' : 'not set',
          BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'not set',
        },
      },
      { status: 200 },
      request,
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return corsResponse(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
      request,
    );
  }
}
