import { auth } from '@/utils/auth';
import { db, Departments } from '@db';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// This endpoint is ONLY for E2E tests - never enable in production!
export async function POST(request: NextRequest) {
  // SECONDARY GUARD: Block in production even if E2E_TEST_MODE is accidentally set
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  // Only allow in E2E test mode
  if (process.env.E2E_TEST_MODE !== 'true') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  // Add a timeout wrapper
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out after 30 seconds')), 30000);
  });

  try {
    const result = await Promise.race([handleLogin(request), timeoutPromise]);
    return result as NextResponse;
  } catch (error) {
    console.error('[TEST-LOGIN] Error in POST handler:', error);
    return NextResponse.json(
      { error: 'Failed to create test session', details: error },
      { status: 500 },
    );
  }
}

async function handleLogin(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error('[TEST-LOGIN] Failed to parse request body:', err);
    return NextResponse.json(
      { error: 'Invalid request body', details: String(err) },
      { status: 400 },
    );
  }

  const { email, name, hasAccess } = body;
  const testPassword = 'Test123456!';

  // For E2E tests, always start with a clean user state
  // Delete existing user if present to avoid password/state issues
  let existingUser;
  try {
    existingUser = await db.user.findUnique({
      where: { email },
    });
  } catch (err) {
    console.error('[TEST-LOGIN] Error looking up existing user:', err);
    return NextResponse.json(
      { error: 'Failed to check for existing user', details: String(err) },
      { status: 500 },
    );
  }

  if (existingUser) {
    try {
      await db.user.delete({ where: { email } });
    } catch (err) {
      console.error('[TEST-LOGIN] Error deleting existing user:', err);
      return NextResponse.json(
        { error: 'Failed to delete existing user', details: String(err) },
        { status: 500 },
      );
    }
  }

  // Create the user using Better Auth's signUpEmail method
  let signUpResponse;
  try {
    signUpResponse = await auth.api.signUpEmail({
      body: {
        email,
        password: testPassword,
        name: name || `Test User ${Date.now()}`,
      },
      headers: request.headers, // Pass the request headers
      asResponse: true,
    });
  } catch (err) {
    console.error('[TEST-LOGIN] Error during signUpEmail:', err);
    return NextResponse.json(
      { error: 'Failed to sign up (exception)', details: String(err) },
      { status: 500 },
    );
  }

  if (!signUpResponse.ok) {
    let errorData;
    try {
      errorData = await signUpResponse.json();
    } catch (err) {
      errorData = { parseError: String(err) };
    }
    console.error('[TEST-LOGIN] Sign up failed:', errorData);
    return NextResponse.json({ error: 'Failed to sign up', details: errorData }, { status: 400 });
  }

  // Mark the user as verified (for test purposes)
  try {
    await db.user.update({
      where: { email },
      data: { emailVerified: true },
    });
  } catch (err) {
    console.error('[TEST-LOGIN] Error marking user as verified:', err);
    return NextResponse.json(
      { error: 'Failed to mark user as verified', details: String(err) },
      { status: 500 },
    );
  }

  // Get the user we just created
  let user;
  try {
    user = await db.user.findUnique({
      where: { email },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found after creation' }, { status: 400 });
    }
  } catch (err) {
    console.error('[TEST-LOGIN] Error fetching user after creation:', err);
    return NextResponse.json(
      { error: 'Failed to fetch user after creation', details: String(err) },
      { status: 500 },
    );
  }

  // Try signing in with a small delay to ensure user is fully committed
  try {
    await new Promise((resolve) => setTimeout(resolve, 100));
  } catch (err) {
    console.error('[TEST-LOGIN] Error during delay:', err);
  }

  let responseData: any;
  let signInResponse;
  try {
    signInResponse = await auth.api.signInEmail({
      body: {
        email,
        password: testPassword,
      },
      headers: request.headers,
      asResponse: true,
    });
  } catch (err) {
    console.error('[TEST-LOGIN] Error during signInEmail:', err);
    return NextResponse.json(
      { error: 'Failed to sign in (exception)', details: String(err) },
      { status: 500 },
    );
  }

  if (!signInResponse.ok) {
    let errorData;
    try {
      errorData = await signInResponse.json();
    } catch (e) {
      try {
        errorData = await signInResponse.text();
      } catch (err) {
        errorData = { parseError: String(err) };
      }
    }
    console.error('[TEST-LOGIN] Sign in failed with error:', errorData);

    // Try alternative approach - create session directly
  } else {
    // Get the response data from successful sign-in
    try {
      responseData = await signInResponse.json();
    } catch (err) {
      console.error('[TEST-LOGIN] Error parsing sign in response JSON:', err);
      return NextResponse.json(
        { error: 'Failed to parse sign in response', details: String(err) },
        { status: 500 },
      );
    }
  }

  // Create an organization for the user if skipOrg is not true
  let org = null;
  if (!body.skipOrg) {
    try {
      org = await db.organization.create({
        data: {
          name: `Test Org ${Date.now()}`,
          hasAccess: hasAccess || false, // Allow setting hasAccess for tests
          members: {
            create: {
              userId: responseData.user.id,
              role: 'owner',
              department: Departments.it,
              isActive: true,
              fleetDmLabelId: 0,
            },
          },
        },
      });
    } catch (err) {
      console.error('[TEST-LOGIN] Error creating organization:', err);
      return NextResponse.json(
        { error: 'Failed to create organization', details: String(err) },
        { status: 500 },
      );
    }

    // Set this as the active organization for the session (non-blocking)
    try {
      const setActiveOrgResponse = await auth.api.setActiveOrganization({
        headers: request.headers,
        body: {
          organizationId: org.id,
        },
        asResponse: true,
      });

      if (!setActiveOrgResponse.ok) {
        // Try again with a small delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        await auth.api.setActiveOrganization({
          headers: request.headers,
          body: {
            organizationId: org.id,
          },
        });
      }
    } catch (err) {
      console.error(
        '[TEST-LOGIN] Warning: Failed to set active organization (continuing anyway):',
        err,
      );
      // Don't fail the entire request - user can still authenticate
      // The middleware will handle setting active org if needed
    }
  }

  // Create a new response with the data
  let response;
  try {
    response = NextResponse.json({
      success: true,
      user: responseData.user,
      session: responseData.session,
      organizationId: body.skipOrg ? null : org?.id,
    });
  } catch (err) {
    console.error('[TEST-LOGIN] Error creating response object:', err);
    return NextResponse.json(
      { error: 'Failed to create response', details: String(err) },
      { status: 500 },
    );
  }

  // Copy all cookies from Better Auth's response to our response
  try {
    const cookies = signInResponse.headers.getSetCookie();
    cookies.forEach((cookie: string) => {
      response.headers.append('Set-Cookie', cookie);
    });
  } catch (err) {
    console.error('[TEST-LOGIN] Error copying cookies:', err);
    // Still return the response, but log the error
  }

  return response;
}
