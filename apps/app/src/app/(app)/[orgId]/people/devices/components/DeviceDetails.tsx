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

const CHECK_NAMES: Record<string, string> = {
  disk_encryption: 'Disk Encryption',
  antivirus: 'Antivirus',
  password_policy: 'Password Policy',
  screen_lock: 'Screen Lock',
};

const PLATFORM_LABELS: Record<string, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

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
                <Text size="lg" weight="semibold">
                  {device.name}
                </Text>
                {device.source === 'fleet' && <Badge variant="outline">Fleet (Legacy)</Badge>}
              </div>
              <Text size="sm" variant="muted">
                {PLATFORM_LABELS[device.platform] ?? device.platform} {device.osVersion}
                {device.hardwareModel ? ` \u2022 ${device.hardwareModel}` : ''}
              </Text>
            </div>
            <Badge variant={device.isCompliant ? 'default' : 'destructive'}>
              {device.isCompliant ? 'Compliant' : 'Non-Compliant'}
            </Badge>
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
                {device.serialNumber ?? 'N/A'}
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

      {device.checks.length > 0 ? (
        <Table variant="bordered">
          <TableHeader>
            <TableRow>
              <TableHead>Check</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {device.checks.map((check) => (
              <TableRow key={check.id}>
                <TableCell>
                  <Text size="sm" weight="medium">
                    {CHECK_NAMES[check.checkType] ?? check.checkType}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {check.details &&
                    typeof check.details === 'object' &&
                    'message' in check.details
                      ? String(check.details.message)
                      : '—'}
                  </Text>
                </TableCell>
                <TableCell>
                  <Badge variant={check.passed ? 'default' : 'destructive'}>
                    {check.passed ? 'Pass' : 'Fail'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Text size="sm" variant="muted">
          No compliance checks have been run yet.
        </Text>
      )}
    </Stack>
  );
};
