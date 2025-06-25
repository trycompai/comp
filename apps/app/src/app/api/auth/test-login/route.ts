import { db } from '@comp/db';
import { NextRequest, NextResponse } from 'next/server';

// This endpoint is ONLY for E2E tests - never enable in production!
export async function POST(request: NextRequest) {
  // Only allow in test environment
  if (process.env.NODE_ENV === 'production' || !process.env.E2E_TEST_MODE) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Find or create test user
    let user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name: name || 'Test User',
          emailVerified: true,
        },
      });
    }

    // Create a session directly using better-auth's internal session management
    // This is only for testing - in production you'd use proper auth methods
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = await db.session.create({
      data: {
        userId: user.id,
        expiresAt,
        token: crypto.randomUUID(),
        userAgent: request.headers.get('user-agent') || 'test-agent',
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      },
    });

    // Set the session cookie using better-auth's cookie configuration
    const response = NextResponse.json({ success: true, user, session });

    // Use better-auth's default cookie name
    response.cookies.set('better-auth.session_token', session.token, {
      httpOnly: true,
      secure: false, // Test environment
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json({ error: 'Failed to create test session' }, { status: 500 });
  }
}
