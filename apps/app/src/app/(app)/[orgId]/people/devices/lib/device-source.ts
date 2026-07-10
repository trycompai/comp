import type { DeviceWithChecks, SourceComplianceCheck } from '../types';

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

/**
 * The SOURCE integration's own overall verdict (e.g. Intune complianceState).
 * INFORMATIONAL ONLY — shown in the details panel, never used for CompAI's
 * Compliant column/chart: a vendor verdict reflects the customer's MDM policy
 * configuration, not CompAI's framework standard (a policy-less Intune tenant
 * calls everything "compliant").
 */
export function sourceVerdict(device: DeviceWithChecks): boolean | undefined {
  if (device.source !== 'integration') return undefined;
  return device.sourceCompliance?.isCompliant;
}

/**
 * CompAI's framework standard for device compliance — the same four checks
 * the Comp agent measures. A device (from ANY source) is compliant only when
 * all four pass.
 */
export const CANONICAL_DEVICE_CHECKS = [
  { id: 'disk_encryption', label: 'Disk Encryption' },
  { id: 'antivirus', label: 'Antivirus' },
  { id: 'password_policy', label: 'Password Policy' },
  { id: 'screen_lock', label: 'Screen Lock' },
] as const;

export type SourceComplianceVerdict =
  | { kind: 'compliant' }
  | { kind: 'non_compliant' }
  /** Some (or none) of the canonical checks reported, none failed. */
  | { kind: 'unverified'; reported: number; missing: string[] };

/**
 * Computes CompAI's compliance verdict for an imported device from the
 * source-reported CANONICAL checks (extra provider-specific checks are
 * display-only and never affect the verdict):
 * - any canonical check failed  -> non_compliant (one failure is enough)
 * - all four reported & passed  -> compliant
 * - otherwise                   -> unverified (n of 4), listing what's missing
 */
export function computeSourceComplianceVerdict(
  device: DeviceWithChecks,
): SourceComplianceVerdict | null {
  if (device.source !== 'integration') return null;
  const canonicalIds = new Set<string>(CANONICAL_DEVICE_CHECKS.map((c) => c.id));
  const canonical = sourceChecks(device).filter((c) => canonicalIds.has(c.id));
  if (canonical.some((c) => !c.passed)) {
    return { kind: 'non_compliant' };
  }
  const reportedIds = new Set(canonical.map((c) => c.id));
  if (reportedIds.size === CANONICAL_DEVICE_CHECKS.length) {
    return { kind: 'compliant' };
  }
  return {
    kind: 'unverified',
    reported: reportedIds.size,
    missing: CANONICAL_DEVICE_CHECKS.filter((c) => !reportedIds.has(c.id)).map(
      (c) => c.label,
    ),
  };
}

/** Tooltip copy for the "Unverified (n/4)" badge on imported devices. */
export function unverifiedTooltipCopy(
  device: DeviceWithChecks,
  verdict: Extract<SourceComplianceVerdict, { kind: 'unverified' }>,
): string {
  const provider = device.integrationProvider?.name ?? 'The integration';
  const reportedPart =
    verdict.reported === 0
      ? `${provider} reports none of the ${CANONICAL_DEVICE_CHECKS.length} security checks CompAI requires for compliance`
      : `${provider} reports ${verdict.reported} of the ${CANONICAL_DEVICE_CHECKS.length} security checks CompAI requires for compliance (missing: ${verdict.missing.join(', ')})`;
  return `${reportedPart}. Install the CompAI agent on this device for full verification.`;
}

/**
 * The SOURCE integration's own named checks for an imported device (empty when
 * the provider reports none). Provider vocabulary — rendered as-is.
 */
export function sourceChecks(device: DeviceWithChecks): SourceComplianceCheck[] {
  if (device.source !== 'integration') return [];
  return device.sourceCompliance?.checks ?? [];
}

/** Tooltip copy for compliance values reported by the source integration. */
export function sourceReportedTooltipCopy(device: DeviceWithChecks): string {
  const provider = device.integrationProvider?.name ?? 'the integration';
  return `Reported by ${provider}. CompAI didn't run these checks itself — install the CompAI agent for measured compliance.`;
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
