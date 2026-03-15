import { NextRequest, NextResponse } from 'next/server';

/**
 * CLI OAuth callback relay.
 *
 * After OAuth completes, better-auth redirects here with the session cookie
 * already set on the app's domain. This route reads the cookie and relays
 * the session token to the CLI's local HTTP server via localhost redirect.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const port = request.nextUrl.searchParams.get('port');

  // Validate port — must be a number in safe range
  const portNum = port ? parseInt(port, 10) : 0;
  if (!portNum || portNum < 1024 || portNum > 65535) {
    return NextResponse.json(
      { error: 'Invalid or missing port parameter' },
      { status: 400 },
    );
  }

  // Read the session token from the better-auth cookie
  // HTTPS environments use the __Secure- prefix
  const sessionToken =
    request.cookies.get('__Secure-better-auth.session_token')?.value ??
    request.cookies.get('better-auth.session_token')?.value;

  if (!sessionToken) {
    return NextResponse.json(
      {
        error: 'No session found. Please authenticate first.',
      },
      { status: 401 },
    );
  }

  // Redirect to the CLI's local server with the token
  const redirectUrl = new URL(`http://localhost:${portNum}/callback`);
  redirectUrl.searchParams.set('token', sessionToken);

  return NextResponse.redirect(redirectUrl.toString());
}
