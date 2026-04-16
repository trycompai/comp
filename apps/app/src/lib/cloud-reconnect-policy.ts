const CLOUD_RECONNECT_PROVIDER_IDS = new Set(['aws', 'gcp', 'azure']);

/**
 * Connections created before this UTC timestamp require re-connection.
 * This rollout date is fixed intentionally so the behavior is stable over time.
 */
export const CLOUD_RECONNECT_CUTOFF_ISO_UTC = '2026-04-13T18:16:52.000Z';
export const CLOUD_RECONNECT_CUTOFF_LABEL = 'April 13, 2026 at 18:16 UTC';

const CLOUD_RECONNECT_CUTOFF_MS = new Date(CLOUD_RECONNECT_CUTOFF_ISO_UTC).getTime();

type ReconnectCandidate = {
  providerId: string;
  createdAt?: Date | string | null;
  reconnectedAt?: Date | string | null;
  isLegacy?: boolean;
  status?: string | null;
};

export function requiresCloudReconnect(candidate: ReconnectCandidate): boolean {
  if (!CLOUD_RECONNECT_PROVIDER_IDS.has(candidate.providerId)) return false;

  if (candidate.status && candidate.status !== 'active' && candidate.status !== 'pending') {
    return false;
  }

  // Legacy cloud connections come from the old integration table and should be re-added.
  if (candidate.isLegacy) return true;

  if (candidate.reconnectedAt) {
    const reconnectedAt = new Date(candidate.reconnectedAt);
    if (!Number.isNaN(reconnectedAt.getTime())) {
      return reconnectedAt.getTime() < CLOUD_RECONNECT_CUTOFF_MS;
    }
  }

  if (!candidate.createdAt) return false;

  const createdAt = new Date(candidate.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;

  return createdAt.getTime() < CLOUD_RECONNECT_CUTOFF_MS;
}
