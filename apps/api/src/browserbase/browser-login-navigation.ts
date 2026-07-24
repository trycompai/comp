type Stagehand = import('@browserbasehq/stagehand').Stagehand;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A sign-in host (signin./login./auth./sso.) or a sign-in path (/login, /signin,
// /auth, /oauth, /authorize, /sso). A user who is genuinely signed in gets
// redirected OFF these, so "logged in" while still on one is a false positive.
const SIGN_IN_URL =
  /[/.](signin|login|auth|sso)\.|\/(sign[-_]?in|log[-_]?in|login|signin|auth|oauth2?|authorize|sso)(\/|\?|#|$)/i;

/**
 * Whether a URL still looks like a sign-in page. Used to reject a classifier's
 * "already logged in" verdict when the browser is clearly still on the login
 * flow (e.g. AWS bouncing through signin.aws.amazon.com), which would otherwise
 * mark a connection verified without ever entering credentials.
 */
export function looksLikeSignInUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return SIGN_IN_URL.test(url);
}

/**
 * Best-effort navigation to the sign-in form. If the current page is a homepage
 * or dashboard, the agent opens the "Sign in" link so the login form is on
 * screen. Never throws — callers proceed on whatever page they end up on. Shared
 * by login analysis and the automated sign-in so both start from the real form
 * rather than, say, a marketing homepage.
 */
export async function navigateToSignIn(stagehand: Stagehand): Promise<void> {
  try {
    await stagehand.act(
      'If this page is not already a login or sign-in page, find and open the ' +
        '"Sign in" or "Log in" link so the sign-in form is visible. If a sign-in ' +
        'form is already shown, do nothing.',
    );
    await delay(1500);
  } catch {
    // Ignore — detection / sign-in proceeds on the current page.
  }
}
