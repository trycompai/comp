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

export const TAKEOVER_CAPTION_DEFAULT = 'Finish the sign-in above, then confirm.';

// Passkeys can't complete in a remote browser, so steer 2FA takeovers to a code.
export const TAKEOVER_CAPTION_2FA =
  "Enter your authenticator app's 6-digit code above, then confirm. Passkeys " +
  'can’t complete in this browser — use "More options" to pick the authenticator ' +
  'app or SMS.';

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
