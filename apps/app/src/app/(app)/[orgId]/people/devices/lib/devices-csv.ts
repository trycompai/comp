import type { DeviceWithChecks } from '../types';

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
].join(',');

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function yesNo(value: boolean): 'yes' | 'no' {
  return value ? 'yes' : 'no';
}

export function buildDevicesCsv(devices: DeviceWithChecks[]): string {
  const rows = devices.map((d) =>
    [
      escapeCell(d.name),
      escapeCell(d.user.name),
      escapeCell(d.user.email),
      escapeCell(d.platform),
      escapeCell(d.osVersion),
      escapeCell(d.agentVersion ?? ''),
      escapeCell(d.lastCheckIn ?? ''),
      escapeCell(d.daysSinceLastCheckIn ?? ''),
      escapeCell(d.complianceStatus),
      escapeCell(yesNo(d.diskEncryptionEnabled)),
      escapeCell(yesNo(d.antivirusEnabled)),
      escapeCell(yesNo(d.passwordPolicySet)),
      escapeCell(yesNo(d.screenLockEnabled)),
    ].join(','),
  );
  return [DEVICES_CSV_HEADER, ...rows].join('\n') + '\n';
}

export function downloadDevicesCsv(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  const slug = orgSlug && orgSlug.length > 0 ? orgSlug : orgId;
  return `devices-${slug}-${date}.csv`;
}
