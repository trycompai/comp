export type Step =
  | 'enter-url'
  | 'checking'
  | 'choose'
  | 'capture'
  | 'signing-in'
  | 'takeover'
  | 'signin'
  | 'connected'
  | 'error';

// Which rail step (Vendor site → Check → Sign in → Details → Done) each flow
// step maps to.
export const RAIL_INDEX: Record<Step, number> = {
  'enter-url': 0,
  checking: 1,
  choose: 2,
  signin: 2,
  capture: 3,
  'signing-in': 3,
  takeover: 3,
  connected: 4,
  error: 0,
};

// Terminal Trigger.dev run states that aren't a clean success.
export const FAILED_RUN_STATUSES = new Set([
  'CANCELED',
  'FAILED',
  'CRASHED',
  'INTERRUPTED',
  'SYSTEM_FAILURE',
  'EXPIRED',
  'TIMED_OUT',
]);

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'this site';
  }
}

// Caption shown over the live browser when the automated sign-in handed control
// back — explains what happened, in view, instead of a disappearing toast.
export function takeoverCaptionFor(reason: string | null): string {
  switch (reason) {
    case 'invalid_credentials':
      return "That username or password wasn't accepted. Fix it in the browser and confirm, or re-enter your details.";
    case 'needs_2fa':
      return 'Enter your two-factor code in the browser to finish. Add your authenticator setup key next time for unattended runs.';
    case 'challenge':
      return 'The site needs a quick human check — complete it in the browser, then confirm.';
    default:
      return 'Almost there — finish the sign-in in the browser, then confirm.';
  }
}

export function railSubtitleFor(step: Step): string {
  switch (step) {
    case 'connected':
      return 'Connected';
    case 'checking':
      return 'Checking the sign-in page';
    case 'choose':
      return 'Pick how to sign in';
    case 'capture':
      return 'Enter your sign-in details';
    case 'signing-in':
      return 'Signing in for you';
    case 'takeover':
    case 'signin':
      return 'Your turn — finish signing in';
    default:
      return 'So Comp AI can capture evidence on a schedule';
  }
}
