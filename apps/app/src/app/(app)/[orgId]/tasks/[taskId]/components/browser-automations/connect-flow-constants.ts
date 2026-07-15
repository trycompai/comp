export type Step =
  | 'enter-url'
  | 'checking'
  | 'choose'
  | 'capture'
  | 'signing-in'
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
