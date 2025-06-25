import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { Departments } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// This endpoint is ONLY for E2E tests - never enable in production!
export async function POST(request: NextRequest) {
  console.log('[TEST-LOGIN] Endpoint hit');

  // Only allow in E2E test mode
  if (process.env.E2E_TEST_MODE !== 'true') {
    console.log('[TEST-LOGIN] E2E_TEST_MODE is not true:', process.env.E2E_TEST_MODE);
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  console.log('[TEST-LOGIN] E2E mode verified');

  try {
    const body = await request.json();
    console.log('[TEST-LOGIN] Request body:', body);

    const { email, name } = body;
    const testPassword = 'Test123456!'; // Use a stronger test password

    console.log('[TEST-LOGIN] Checking for existing user:', email);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    console.log('[TEST-LOGIN] Existing user found:', !!existingUser);

    if (!existingUser) {
      console.log('[TEST-LOGIN] Creating new user via Better Auth');

      // First, sign up the user using Better Auth's signUpEmail method
      const signUpResponse = await auth.api.signUpEmail({
        body: {
          email,
          password: testPassword,
          name: name || `Test User ${Date.now()}`,
        },
        headers: request.headers, // Pass the request headers
        asResponse: true,
      });

      console.log('[TEST-LOGIN] Sign up response status:', signUpResponse.status);

      if (!signUpResponse.ok) {
        const errorData = await signUpResponse.json();
        return NextResponse.json(
          { error: 'Failed to sign up', details: errorData },
          { status: 400 },
        );
      }

      // Mark the user as verified (for test purposes)
      await db.user.update({
        where: { email },
        data: { emailVerified: true },
      });

      // Get the user to create organization
      const user = await db.user.findUnique({
        where: { email },
      });

      if (user) {
        // Create a test organization for the user
        await db.organization.create({
          data: {
            name: `Test Org ${Date.now()}`,
            members: {
              create: {
                userId: user.id,
                role: 'owner',
                department: Departments.hr,
                isActive: true,
                fleetDmLabelId: Math.floor(Math.random() * 10000),
              },
            },
          },
        });
      }
    }

    // Always sign in to get a fresh session with updated user state
    console.log('[TEST-LOGIN] Signing in user:', email);

    const signInResponse = await auth.api.signInEmail({
      body: {
        email,
        password: testPassword,
      },
      headers: request.headers, // Pass the request headers
      asResponse: true,
    });

    console.log('[TEST-LOGIN] Sign in response status:', signInResponse.status);

    if (!signInResponse.ok) {
      const errorData = await signInResponse.json();
      console.log('[TEST-LOGIN] Sign in failed:', errorData);
      return NextResponse.json({ error: 'Failed to sign in', details: errorData }, { status: 400 });
    }

    // Get the response data
    const responseData = await signInResponse.json();
    console.log('[TEST-LOGIN] Sign in successful, preparing response');

    // Create a new response with the data
    const response = NextResponse.json({
      success: true,
      user: responseData.user,
      session: responseData.session,
    });

    // Copy all cookies from Better Auth's response to our response
    const cookies = signInResponse.headers.getSetCookie();
    console.log('[TEST-LOGIN] Setting cookies count:', cookies.length);
    cookies.forEach((cookie) => {
      response.headers.append('Set-Cookie', cookie);
    });

    console.log('[TEST-LOGIN] Returning success response');
    return response;
  } catch (error) {
    console.error('[TEST-LOGIN] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create test session', details: error },
      { status: 500 },
    );
  }
}
