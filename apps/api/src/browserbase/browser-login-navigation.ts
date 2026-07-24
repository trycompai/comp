type Stagehand = import('@browserbasehq/stagehand').Stagehand;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
