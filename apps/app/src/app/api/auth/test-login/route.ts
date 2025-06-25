import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { Departments } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

// This endpoint is ONLY for E2E tests - never enable in production!
export async function POST(request: NextRequest) {
  // Only allow in E2E test mode
  if (process.env.E2E_TEST_MODE !== 'true') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  try {
    const { email, name } = await request.json();
    const testPassword = 'Test123456!'; // Use a stronger test password

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
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
    const signInResponse = await auth.api.signInEmail({
      body: {
        email,
        password: testPassword,
      },
      headers: request.headers, // Pass the request headers
      asResponse: true,
    });

    if (!signInResponse.ok) {
      const errorData = await signInResponse.json();
      return NextResponse.json({ error: 'Failed to sign in', details: errorData }, { status: 400 });
    }

    // Get the response data
    const responseData = await signInResponse.json();

    // Create a new response with the data
    const response = NextResponse.json({
      success: true,
      user: responseData.user,
      session: responseData.session,
    });

    // Copy all cookies from Better Auth's response to our response
    const cookies = signInResponse.headers.getSetCookie();
    cookies.forEach((cookie) => {
      response.headers.append('Set-Cookie', cookie);
    });

    return response;
  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json(
      { error: 'Failed to create test session', details: error },
      { status: 500 },
    );
  }
}
