import { auth } from '@/utils/auth';
import { db, Departments } from '@db';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// This endpoint is ONLY for E2E tests - never enable in production!
export async function POST(request: NextRequest) {
  console.log('[TEST-LOGIN] =========================');
  console.log('[TEST-LOGIN] Endpoint hit at:', new Date().toISOString());
  console.log('[TEST-LOGIN] E2E_TEST_MODE:', process.env.E2E_TEST_MODE);
  console.log('[TEST-LOGIN] NODE_ENV:', process.env.NODE_ENV);
  console.log('[TEST-LOGIN] Request URL:', request.url);
  console.log('[TEST-LOGIN] Request headers:', Object.fromEntries(request.headers.entries()));
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
    console.log('[TEST-LOGIN] Request body:', body);
  } catch (err) {
    console.error('[TEST-LOGIN] Failed to parse request body:', err);
    return NextResponse.json(
      { error: 'Invalid request body', details: String(err) },
      { status: 400 },
    );
  }

  const { email, name, hasAccess } = body;
  const testPassword = 'Test123456!'; // Use a stronger test password

  console.log('[TEST-LOGIN] Checking for existing user:', email);

  // For E2E tests, always start with a clean user state
  // Delete existing user if present to avoid password/state issues
  let existingUser;
  try {
    existingUser = await db.user.findUnique({
      where: { email },
    });
    console.log(
      '[TEST-LOGIN] Existing user lookup result:',
      existingUser ? existingUser.id : 'none',
    );
  } catch (err) {
    console.error('[TEST-LOGIN] Error looking up existing user:', err);
    return NextResponse.json(
      { error: 'Failed to check for existing user', details: String(err) },
      { status: 500 },
    );
  }

  if (existingUser) {
    try {
      console.log('[TEST-LOGIN] Deleting existing user for clean state');
      await db.user.delete({ where: { email } });
      console.log('[TEST-LOGIN] Existing user deleted');
    } catch (err) {
      console.error('[TEST-LOGIN] Error deleting existing user:', err);
      return NextResponse.json(
        { error: 'Failed to delete existing user', details: String(err) },
        { status: 500 },
      );
    }
  }

  console.log('[TEST-LOGIN] Creating new user via Better Auth');

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
    console.log('[TEST-LOGIN] Sign up response status:', signUpResponse.status);
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
    console.log('[TEST-LOGIN] User marked as verified');
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
      console.log('[TEST-LOGIN] User not found after creation');
      return NextResponse.json({ error: 'User not found after creation' }, { status: 400 });
    }
    console.log('[TEST-LOGIN] User found:', user.id, user.email);
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
    console.log('[TEST-LOGIN] Delay after user creation complete');
  } catch (err) {
    console.error('[TEST-LOGIN] Error during delay:', err);
  }

  console.log('[TEST-LOGIN] Attempting sign in for user:', email, 'with password:', testPassword);

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
    console.log('[TEST-LOGIN] Sign in response status:', signInResponse.status);
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
    console.log(
      '[TEST-LOGIN] Response headers:',
      Object.fromEntries(signInResponse.headers.entries()),
    );

    // Try alternative approach - create session directly
    console.log('[TEST-LOGIN] Attempting direct session creation...');
  } else {
    // Get the response data from successful sign-in
    try {
      responseData = await signInResponse.json();
      console.log('[TEST-LOGIN] Sign in successful, user:', responseData.user?.id);
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
    console.log('[TEST-LOGIN] Creating test organization');
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
      console.log('[TEST-LOGIN] Created organization:', org.id);
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
        console.log('[TEST-LOGIN] Warning: setActiveOrganization returned non-ok status');
        // Try again with a small delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        await auth.api.setActiveOrganization({
          headers: request.headers,
          body: {
            organizationId: org.id,
          },
        });
      }

      console.log('[TEST-LOGIN] Set organization as active:', org.id);
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
    console.log('[TEST-LOGIN] Created response object');
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
    console.log('[TEST-LOGIN] Setting cookies count:', cookies.length);
    cookies.forEach((cookie: string) => {
      response.headers.append('Set-Cookie', cookie);
    });
  } catch (err) {
    console.error('[TEST-LOGIN] Error copying cookies:', err);
    // Still return the response, but log the error
  }

  console.log('[TEST-LOGIN] Returning success response');
  return response;
}
