'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { ArrowLeft } from '@trycompai/design-system/icons';
import type { DeviceWithChecks } from '../types';

const CHECK_FIELDS = [
  { key: 'diskEncryptionEnabled' as const, dbKey: 'disk_encryption', label: 'Disk Encryption' },
  { key: 'antivirusEnabled' as const, dbKey: 'antivirus', label: 'Antivirus' },
  { key: 'passwordPolicySet' as const, dbKey: 'password_policy', label: 'Password Policy' },
  { key: 'screenLockEnabled' as const, dbKey: 'screen_lock', label: 'Screen Lock' },
];

const PLATFORM_LABELS: Record<string, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

/** Device is considered online if it checked in within the last 2 hours */
function isDeviceOnline(lastCheckIn: string | null): boolean {
  if (!lastCheckIn) return false;
  const diffMs = Date.now() - new Date(lastCheckIn).getTime();
  return diffMs < 2 * 60 * 60 * 1000;
}

function staleLabel(daysSinceLastCheckIn: number | null): string {
  return daysSinceLastCheckIn === null ? 'Stale' : `Stale (${daysSinceLastCheckIn}d)`;
}

function staleTitle(daysSinceLastCheckIn: number | null): string {
  return daysSinceLastCheckIn === null
    ? 'No check-ins recorded'
    : `No check-in in ${daysSinceLastCheckIn} days`;
}

function DeviceComplianceBadge({ device }: { device: DeviceWithChecks }) {
  if (device.complianceStatus === 'stale') {
    return (
      <Badge variant="secondary" title={staleTitle(device.daysSinceLastCheckIn)}>
        {staleLabel(device.daysSinceLastCheckIn)}
      </Badge>
    );
  }
  if (device.complianceStatus === 'compliant') {
    return <Badge variant="default">Compliant</Badge>;
  }
  return <Badge variant="destructive">Non-Compliant</Badge>;
}

interface DeviceDetailsProps {
  device: DeviceWithChecks;
  onClose: () => void;
}

export const DeviceDetails = ({ device, onClose }: DeviceDetailsProps) => {
  return (
    <Stack gap="4">
      <div>
        <Button variant="outline" size="sm" onClick={onClose}>
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                    isDeviceOnline(device.lastCheckIn)
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
                <Text size="lg" weight="semibold">
                  {device.name}
                </Text>
                <Badge variant="outline">
                  {isDeviceOnline(device.lastCheckIn) ? 'Online' : 'Offline'}
                </Badge>
                {device.source === 'fleet' && <Badge variant="outline">Fleet (Legacy)</Badge>}
              </div>
              <Text size="sm" variant="muted">
                {PLATFORM_LABELS[device.platform] ?? device.platform} {device.osVersion}
                {device.hardwareModel ? ` \u2022 ${device.hardwareModel}` : ''}
              </Text>
            </div>
            <DeviceComplianceBadge device={device} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Text size="sm" variant="muted">
                User
              </Text>
              <Text size="sm" weight="medium">
                {device.user.name}
              </Text>
              <Text size="xs" variant="muted">
                {device.user.email}
              </Text>
            </div>
            <div>
              <Text size="sm" variant="muted">
                Hostname
              </Text>
              <Text size="sm" weight="medium">
                {device.hostname}
              </Text>
            </div>
            <div>
              <Text size="sm" variant="muted">
                Serial Number
              </Text>
              <Text size="sm" weight="medium">
                {device.serialNumber?.startsWith('fallback:')
                  ? 'Generic serial number'
                  : (device.serialNumber ?? 'N/A')}
              </Text>
            </div>
            <div>
              <Text size="sm" variant="muted">
                Last Check-in
              </Text>
              <Text size="sm" weight="medium">
                {device.lastCheckIn ? new Date(device.lastCheckIn).toLocaleString() : 'Never'}
              </Text>
            </div>
            <div>
              <Text size="sm" variant="muted">
                Agent Version
              </Text>
              <Text size="sm" weight="medium">
                {device.agentVersion ?? 'N/A'}
              </Text>
            </div>
            <div>
              <Text size="sm" variant="muted">
                Installed
              </Text>
              <Text size="sm" weight="medium">
                {new Date(device.installedAt).toLocaleDateString()}
              </Text>
            </div>
          </div>
        </CardContent>
      </Card>

      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Check</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Exception</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {CHECK_FIELDS.map(({ key, dbKey, label }) => {
            const isFleetUnsupported = device.source === 'fleet' && key !== 'diskEncryptionEnabled';
            const isStale = device.complianceStatus === 'stale';
            const passed = device[key];
            const details = device.checkDetails?.[dbKey];
            return (
              <TableRow key={key}>
                <TableCell>
                  <Text size="sm" weight="medium">
                    {label}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {isFleetUnsupported
                      ? 'Not tracked by Fleet'
                      : isStale
                        ? '—'
                        : (details?.message ?? '—')}
                  </Text>
                </TableCell>
                <TableCell>
                  {isFleetUnsupported ? (
                    <Badge variant="outline">N/A</Badge>
                  ) : isStale ? (
                    <Badge
                      variant="secondary"
                      title={`${label} — unknown (device is stale)`}
                    >
                      —
                    </Badge>
                  ) : (
                    <Badge variant={passed ? 'default' : 'destructive'}>
                      {passed ? 'Pass' : 'Fail'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {isStale ? '—' : (details?.exception ?? '—')}
                  </Text>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Stack>
  );
};
