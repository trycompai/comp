type Stagehand = import('@browserbasehq/stagehand').Stagehand;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Current URL of the active page — a hint for settling; '' when unavailable. */
function currentUrl(stagehand: Stagehand): string {
  try {
    const pages = stagehand.context?.pages?.() ?? [];
    return pages[pages.length - 1]?.url() ?? '';
  } catch {
    return '';
  }
}

/**
 * Wait until the URL stops changing, so a redirect chain (e.g. AWS bouncing from
 * the homepage through signin.aws.amazon.com) finishes before the caller reads or
 * fills the page. Bounded so a page that never settles can't hang the run.
 */
async function waitForUrlToSettle(stagehand: Stagehand): Promise<void> {
  let previous = currentUrl(stagehand);
  for (let i = 0; i < 8; i += 1) {
    await delay(700);
    const now = currentUrl(stagehand);
    if (now === previous) return;
    previous = now;
  }
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
        '"Sign in", "Sign in to Console", or "Log in" link so the sign-in form is ' +
        'visible. If a sign-in form is already shown, do nothing.',
    );
    // A sign-in link often kicks off a redirect chain; don't read/fill until it
    // settles, or we'd act on the old (e.g. marketing homepage) page.
    await waitForUrlToSettle(stagehand);
  } catch {
    // Ignore — detection / sign-in proceeds on the current page.
  }
}
