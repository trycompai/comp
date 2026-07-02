import type { DeviceWithChecks } from '../types';

/**
 * Human label for where a device came from. Shared by the devices table, the
 * details panel, and the CSV export so they can't drift on source labels.
 */
export function sourceLabel(device: DeviceWithChecks): string {
  if (device.source === 'integration') {
    return device.integrationProvider?.name ?? 'Integration';
  }
  if (device.source === 'fleet') return 'Fleet';
  return 'Comp Agent';
}

/**
 * Stable identifier for a device's source — used to key the source filter so two
 * distinct providers that happen to share a display name don't collapse into one
 * option. (sourceLabel is for display only.)
 */
export function sourceKey(device: DeviceWithChecks): string {
  if (device.source === 'integration') {
    return `integration:${device.integrationProvider?.slug ?? 'unknown'}`;
  }
  return device.source; // 'device_agent' | 'fleet'
}

/**
 * True for devices whose compliance posture CompAI actually collects. Only
 * integration-imported devices are inventory-only ("Not tracked"); agent and
 * Fleet devices both report real compliance.
 */
export function isComplianceTracked(device: DeviceWithChecks): boolean {
  return device.source !== 'integration';
}

// ---------------------------------------------------------------------------
// Shared device presentation helpers (used by both the list and details views
// so copy/labels/thresholds can't drift between them).
// ---------------------------------------------------------------------------

export const PLATFORM_LABELS: Record<string, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

export const CHECK_FIELDS = [
  { key: 'diskEncryptionEnabled' as const, dbKey: 'disk_encryption', label: 'Disk Encryption' },
  { key: 'antivirusEnabled' as const, dbKey: 'antivirus', label: 'Antivirus' },
  { key: 'passwordPolicySet' as const, dbKey: 'password_policy', label: 'Password Policy' },
  { key: 'screenLockEnabled' as const, dbKey: 'screen_lock', label: 'Screen Lock' },
];

export function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

/** Device is considered online if it checked in within the last 2 hours. */
export function isDeviceOnline(lastCheckIn: string | null): boolean {
  if (!lastCheckIn) return false;
  return Date.now() - new Date(lastCheckIn).getTime() < 2 * 60 * 60 * 1000;
}

export function staleLabel(daysSinceLastCheckIn: number | null): string {
  return daysSinceLastCheckIn === null ? 'Stale' : `Stale (${daysSinceLastCheckIn}d)`;
}

export function staleTooltipCopy(daysSinceLastCheckIn: number | null): string {
  return daysSinceLastCheckIn === null
    ? "This device was registered but hasn't sent a compliance check yet. If it's not new, the agent may not be running or the device may be offline."
    : "This device hasn't reported to CompAI in over 7 days, so we can't verify its current compliance. It may be offline, the agent may need to be updated, or the device may no longer be in use. Check with the employee.";
}

/** Tooltip copy for the "Not tracked" badge on integration-imported devices. */
export function notTrackedTooltipCopy(device: DeviceWithChecks): string {
  const provider = device.integrationProvider?.name ?? 'an integration';
  return `This device was imported from ${provider}. CompAI doesn't collect compliance checks for imported devices — install the CompAI agent to track its security posture.`;
}
