export interface SignInCallbackUrls {
  /** Where better-auth sends the user after a successful OAuth sign-in. */
  callbackURL: string;
  /** Where better-auth sends the user when the OAuth callback errors. */
  errorCallbackURL: string;
}

/**
 * Build the success + error callback URLs for a portal OAuth (Google/Microsoft)
 * sign-in.
 *
 * Both URLs are absolute and rooted at the PORTAL origin. Passing an
 * `errorCallbackURL` is essential: without it, better-auth falls back to a
 * default error URL rooted at the API's baseURL (api.trycomp.ai) when the OAuth
 * callback errors, which lands the user on the Swagger API docs page instead of
 * the portal (see redirectOnError/parseState in better-auth and CS-760). This is
 * most visible for brand-new Microsoft/Entra work accounts, whose ID token can
 * miss claims and trip the error path. Sending the error path back to the
 * portal's /auth page lets the user retry or fall back to the magic-link login.
 */
export function buildSignInCallbackUrls({
  origin,
  inviteCode,
  searchParams,
}: {
  origin: string;
  inviteCode?: string;
  searchParams?: URLSearchParams;
}): SignInCallbackUrls {
  const isDeviceAuth = searchParams?.get('device_auth') === 'true';
  const successPath = isDeviceAuth
    ? '/auth/device-callback'
    : inviteCode
      ? `/invite/${inviteCode}`
      : '/';

  return {
    callbackURL: withSearchParams(new URL(successPath, origin), searchParams).toString(),
    // On error, return the user to the portal sign-in page (never the API).
    errorCallbackURL: withSearchParams(new URL('/auth', origin), searchParams).toString(),
  };
}

function withSearchParams(url: URL, searchParams?: URLSearchParams): URL {
  searchParams?.forEach((value, key) => {
    url.searchParams.append(key, value);
  });
  return url;
}
