import type { DeviceWithChecks } from '../types';
import { isComplianceTracked, sourceLabel, sourceVerdict } from './device-source';

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
    // Integration-imported devices are inventory-only for OUR checks; agent +
    // Fleet carry measured compliance. When the source integration reports its
    // own verdict, export it with explicit attribution.
    const tracked = isComplianceTracked(d);
    const verdict = sourceVerdict(d);
    const status = tracked
      ? d.complianceStatus
      : verdict === undefined
        ? 'not_tracked'
        : verdict
          ? 'compliant (source-reported)'
          : 'non_compliant (source-reported)';
    const check = (value: boolean) => (tracked ? yesNo(value) : 'n/a');
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
      escapeCell(check(d.diskEncryptionEnabled)),
      escapeCell(check(d.antivirusEnabled)),
      escapeCell(check(d.passwordPolicySet)),
      escapeCell(check(d.screenLockEnabled)),
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
