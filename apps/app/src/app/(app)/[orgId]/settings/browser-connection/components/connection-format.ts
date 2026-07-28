export type ConnectionStatus = 'unverified' | 'verified' | 'needs_reauth' | 'blocked';

/** A vendor login Comp uses to capture evidence (one per site login). */
export interface Connection {
  id: string;
  hostname: string;
  loginIdentity: string;
  displayName: string;
  status: ConnectionStatus;
  lastVerifiedAt?: string | null;
  lastAuthCheckUrl?: string | null;
  blockedReason?: string | null;
  vaultProvider?: string | null;
  vaultExternalItemRef?: string | null;
  /** How many automations in the org run on this connection. */
  automationCount?: number;
}

export type SignInMethod = 'password' | 'sso';

/** Password = Comp signs in unattended (creds in the vault); otherwise SSO/manual. */
export function methodOf(connection: Connection): SignInMethod {
  return connection.vaultExternalItemRef ? 'password' : 'sso';
}

export interface StatusMeta {
  label: string;
  color: string;
  bg: string;
  /** Attention states surface a primary action (reconnect) in the row. */
  needsAction: boolean;
}

export function statusMeta(status: ConnectionStatus): StatusMeta {
  switch (status) {
    case 'verified':
      return {
        label: 'Active',
        color: 'var(--success)',
        bg: 'color-mix(in oklab, var(--success) 14%, transparent)',
        needsAction: false,
      };
    case 'needs_reauth':
      return {
        label: 'Needs reconnect',
        color: 'oklch(0.5 0.14 85)',
        bg: 'color-mix(in oklab, var(--warning) 20%, transparent)',
        needsAction: true,
      };
    case 'blocked':
      return {
        label: 'Blocked',
        color: 'var(--destructive)',
        bg: 'color-mix(in oklab, var(--destructive) 12%, transparent)',
        needsAction: true,
      };
    default:
      return {
        label: 'Not verified',
        color: 'var(--muted-foreground)',
        bg: 'var(--muted)',
        needsAction: true,
      };
  }
}

/**
 * How long a connection can keep running on its own — the axis the connections
 * list is really about. Derived from the session status, the sign-in method, and
 * whether an authenticator key is stored:
 * - `permanent`  — password + stored 2FA key: re-signs in unattended.
 * - `atrisk`     — password, no 2FA key: works now, may pause when the vendor
 *                  next asks for a code (fixable by adding the key).
 * - `sso`        — SSO: can't be renewed unattended; expect occasional re-sign-in.
 * - `reconnect`  — already paused (needs reconnect / blocked).
 */
export type PermanenceState = 'permanent' | 'atrisk' | 'sso' | 'reconnect';

export function permanenceStateOf(args: {
  connection: Connection;
  totpConfigured: boolean;
}): PermanenceState {
  const { connection, totpConfigured } = args;
  // A never-verified session is also "reconnect" — it hasn't signed in yet, so a
  // stored key doesn't make it renewable and it must not read as "stays signed in".
  if (
    connection.status === 'needs_reauth' ||
    connection.status === 'blocked' ||
    connection.status === 'unverified'
  ) {
    return 'reconnect';
  }
  if (methodOf(connection) === 'sso') return 'sso';
  return totpConfigured ? 'permanent' : 'atrisk';
}

export interface PermanenceMeta {
  badge: string;
  color: string;
  bg: string;
  /** The action the row surfaces: add a key, reconnect, or nothing. */
  action: 'key' | 'reconnect' | null;
}

export function permanenceMeta(state: PermanenceState): PermanenceMeta {
  switch (state) {
    case 'permanent':
      return {
        badge: 'Stays signed in',
        color: 'color-mix(in oklab, var(--success) 60%, var(--foreground))',
        bg: 'color-mix(in oklab, var(--success) 14%, transparent)',
        action: null,
      };
    case 'atrisk':
      return {
        badge: 'Signed in for now',
        color: 'color-mix(in oklab, var(--warning) 52%, var(--foreground))',
        bg: 'color-mix(in oklab, var(--warning) 20%, transparent)',
        action: 'key',
      };
    case 'sso':
      return {
        badge: 'Signed in',
        color: 'var(--muted-foreground)',
        bg: 'var(--muted)',
        action: null,
      };
    case 'reconnect':
      return {
        badge: 'Reconnect needed',
        color: 'color-mix(in oklab, var(--destructive) 70%, var(--foreground))',
        bg: 'color-mix(in oklab, var(--destructive) 12%, transparent)',
        action: 'reconnect',
      };
  }
}

/** The one-line explanation shown under a connection, framed around longevity. */
export function permanenceHint(args: {
  state: PermanenceState;
  vendorName: string;
  blockedReason?: string | null;
}): string {
  const { state, vendorName, blockedReason } = args;
  switch (state) {
    case 'permanent':
      return 'Signs back in on its own — 2FA codes are generated at each run.';
    case 'atrisk':
      return `${vendorName} may ask for a 2FA code in the next few weeks. Add your authenticator key to keep it running on its own.`;
    case 'sso':
      return 'Signs in through SSO — sessions can’t be renewed unattended, so expect an occasional re-sign-in.';
    case 'reconnect':
      return (
        blockedReason ||
        `Paused — ${vendorName} needs to sign in again. Reconnect to resume runs.`
      );
  }
}

const HUES = ['#1a1e22', '#0b6bcb', '#b7791f', '#5f4b8b', '#3d2f6b', '#2f6b4b', '#6b2f3d'];

/** Two-letter monogram from the vendor host (github.com -> GH). */
export function monogram(hostname: string): string {
  const name = hostname.replace(/^www\./, '').split('.')[0] || hostname;
  return name.slice(0, 2).toUpperCase();
}

/** Stable brand-ish color per host so rows are scannable. */
export function hueFor(hostname: string): string {
  let hash = 0;
  for (let i = 0; i < hostname.length; i += 1) {
    hash = (hash * 31 + hostname.charCodeAt(i)) >>> 0;
  }
  return HUES[hash % HUES.length];
}

export interface ConnectionSummary {
  total: number;
  active: number;
  needAttention: number;
}

export function summarize(connections: Connection[]): ConnectionSummary {
  const active = connections.filter((c) => c.status === 'verified').length;
  return { total: connections.length, active, needAttention: connections.length - active };
}
