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
