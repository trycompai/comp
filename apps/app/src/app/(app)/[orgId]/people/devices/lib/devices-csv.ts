import type { DeviceWithChecks } from '../types';
import {
  CANONICAL_DEVICE_CHECKS,
  computeSourceComplianceVerdict,
  isComplianceTracked,
  sourceChecks,
  sourceLabel,
} from './device-source';

export const DEVICES_CSV_HEADER = [
  'Device Name',
  'User Name',
  'Email',
  'Platform',
  'OS Version',
  'Agent Version',
  'Last Check-in (ISO)',
  'Days Since Sync',
  'Status',
  'Disk Encryption',
  'Antivirus',
  'Password Policy',
  'Screen Lock',
  'Source',
].join(',');

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (FORMULA_TRIGGER.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function yesNo(value: boolean): 'yes' | 'no' {
  return value ? 'yes' : 'no';
}

export function buildDevicesCsv(devices: DeviceWithChecks[]): string {
  const rows = devices.map((d) => {
    // Imported devices are judged by CompAI's OWN standard — the same four
    // canonical checks the agent measures — computed from the data the source
    // integration reports. Unreported canonical checks export as 'unverified'.
    const tracked = isComplianceTracked(d);
    const verdict = computeSourceComplianceVerdict(d);
    const status = tracked
      ? d.complianceStatus
      : verdict === null || verdict.kind === 'not_tracked'
        ? 'not_tracked'
        : verdict.kind === 'unverified'
          ? `unverified (${verdict.reported}/${CANONICAL_DEVICE_CHECKS.length} checks reported)`
          : verdict.kind;
    const bySourceId = new Map(sourceChecks(d).map((c) => [c.id, c.passed]));
    const check = (agentValue: boolean, canonicalId: string) => {
      if (tracked) return yesNo(agentValue);
      const reported = bySourceId.get(canonicalId);
      return reported === undefined ? 'unverified' : yesNo(reported);
    };
    return [
      escapeCell(d.name),
      escapeCell(d.user.name),
      escapeCell(d.user.email),
      escapeCell(d.platform),
      escapeCell(d.osVersion),
      escapeCell(d.agentVersion ?? ''),
      escapeCell(d.lastCheckIn ?? ''),
      escapeCell(d.daysSinceLastCheckIn ?? ''),
      escapeCell(status),
      escapeCell(check(d.diskEncryptionEnabled, 'disk_encryption')),
      escapeCell(check(d.antivirusEnabled, 'antivirus')),
      escapeCell(check(d.passwordPolicySet, 'password_policy')),
      escapeCell(check(d.screenLockEnabled, 'screen_lock')),
      escapeCell(sourceLabel(d)),
    ].join(',');
  });
  // RFC 4180: records separated by CRLF; trailing CRLF after the final record.
  // Prepend a UTF-8 BOM so Excel correctly detects UTF-8 encoding for non-ASCII data.
  return '\uFEFF' + [DEVICES_CSV_HEADER, ...rows].join('\r\n') + '\r\n';
}

export function downloadDevicesCsv(filename: string, contents: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Defer revoke so the browser can finish dispatching the download first.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

export function devicesCsvFilename({
  orgSlug,
  orgId,
  now = new Date(),
}: {
  orgSlug?: string;
  orgId: string;
  now?: Date;
}): string {
  const date = now.toISOString().slice(0, 10);
  const raw = orgSlug && orgSlug.length > 0 ? orgSlug : orgId;
  const safe = sanitizeFilenamePart(raw);
  return `devices-${safe}-${date}.csv`;
}
