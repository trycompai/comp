import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { Departments } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// This endpoint is ONLY for E2E tests - never enable in production!
export async function POST(request: NextRequest) {
  console.log('[TEST-LOGIN] =========================');
  console.log('[TEST-LOGIN] Endpoint hit at:', new Date().toISOString());
  console.log('[TEST-LOGIN] E2E_TEST_MODE:', process.env.E2E_TEST_MODE);
  console.log('[TEST-LOGIN] NODE_ENV:', process.env.NODE_ENV);
  console.log('[TEST-LOGIN] =========================');

  // Only allow in E2E test mode
  if (process.env.E2E_TEST_MODE !== 'true') {
    console.log('[TEST-LOGIN] E2E_TEST_MODE is not true:', process.env.E2E_TEST_MODE);
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  console.log('[TEST-LOGIN] E2E mode verified');

  // Add a timeout wrapper
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out after 30 seconds')), 30000);
  });

  try {
    const result = await Promise.race([handleLogin(request), timeoutPromise]);
    return result as NextResponse;
  } catch (error) {
    console.error('[TEST-LOGIN] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create test session', details: error },
      { status: 500 },
    );
  }
}

async function handleLogin(request: NextRequest) {
  const body = await request.json();
  console.log('[TEST-LOGIN] Request body:', body);

  const { email, name, hasAccess } = body;
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
      return NextResponse.json({ error: 'Failed to sign up', details: errorData }, { status: 400 });
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

    if (user && !body.skipOrg) {
      // Create a test organization for the user only if skipOrg is not true
      await db.organization.create({
        data: {
          name: `Test Org ${Date.now()}`,
          hasAccess: hasAccess || false, // Allow setting hasAccess for tests
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
  console.log('[TEST-LOGIN] Sign in successful, user:', responseData.user.id);

  // Create an organization for the user if skipOrg is not true
  let org = null;
  if (!body.skipOrg) {
    console.log('[TEST-LOGIN] Creating test organization');

    org = await db.organization.create({
      data: {
        id: `org_${Date.now()}`,
        name: `Test Org ${Date.now()}`,
        hasAccess: hasAccess || false, // Allow setting hasAccess for tests
        members: {
          create: {
            id: `mem_${Date.now()}`,
            userId: responseData.user.id,
            role: 'owner',
            department: Departments.it,
            isActive: true,
            fleetDmLabelId: 0,
          },
        },
      },
    });

    console.log('[TEST-LOGIN] Created organization:', org.id);

    // Don't set active organization here - let the client handle it
    // The session will have the organization available

    console.log('[TEST-LOGIN] Organization created successfully');
  }

  // Create a new response with the data
  const response = NextResponse.json({
    success: true,
    user: responseData.user,
    session: responseData.session,
    organizationId: body.skipOrg ? null : org?.id,
  });

  // Copy all cookies from Better Auth's response to our response
  const cookies = signInResponse.headers.getSetCookie();
  console.log('[TEST-LOGIN] Setting cookies count:', cookies.length);
  cookies.forEach((cookie: string) => {
    response.headers.append('Set-Cookie', cookie);
  });

  console.log('[TEST-LOGIN] Returning success response');
  return response;
}
