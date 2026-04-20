'use client';

import {
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Download, Search } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { DeviceWithChecks } from '../types';
import {
  buildDevicesCsv,
  devicesCsvFilename,
  downloadDevicesCsv,
} from '../lib/devices-csv';
import { DeviceDetails } from './DeviceDetails';

export interface DeviceAgentDevicesListProps {
  devices: DeviceWithChecks[];
}

const CHECK_FIELDS = [
  { key: 'diskEncryptionEnabled' as const, label: 'Disk Encryption' },
  { key: 'antivirusEnabled' as const, label: 'Antivirus' },
  { key: 'passwordPolicySet' as const, label: 'Password Policy' },
  { key: 'screenLockEnabled' as const, label: 'Screen Lock' },
];

const PLATFORM_LABELS: Record<string, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/** Device is considered online if it checked in within the last 2 hours */
function isDeviceOnline(lastCheckIn: string | null): boolean {
  if (!lastCheckIn) return false;
  const diffMs = Date.now() - new Date(lastCheckIn).getTime();
  return diffMs < 2 * 60 * 60 * 1000;
}

function staleLabel(daysSinceLastCheckIn: number | null): string {
  return daysSinceLastCheckIn === null ? 'Stale' : `Stale (${daysSinceLastCheckIn}d)`;
}

function UserNameCell({ device, orgId }: { device: DeviceWithChecks; orgId: string }) {
  const memberId = device.memberId;

  if (!memberId) {
    return (
      <div className="flex flex-col">
        <Text size="sm" weight="medium">{device.user.name}</Text>
        <Text size="xs" variant="muted">{device.user.email}</Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Link
        href={`/${orgId}/people/${memberId}`}
        className="truncate text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {device.user.name}
      </Link>
      <Text size="xs" variant="muted">{device.user.email}</Text>
    </div>
  );
}

function CompliantBadge({ device }: { device: DeviceWithChecks }) {
  if (device.complianceStatus === 'stale') {
    return (
      <Badge
        variant="secondary"
        title={
          device.daysSinceLastCheckIn === null
            ? 'No check-ins recorded'
            : `No check-in in ${device.daysSinceLastCheckIn} days`
        }
      >
        {staleLabel(device.daysSinceLastCheckIn)}
      </Badge>
    );
  }
  if (device.complianceStatus === 'compliant') {
    return <Badge variant="default">Yes</Badge>;
  }
  return <Badge variant="destructive">No</Badge>;
}

function CheckBadges({ device }: { device: DeviceWithChecks }) {
  if (device.complianceStatus === 'stale') {
    return (
      <div className="flex flex-wrap gap-1">
        {CHECK_FIELDS.map(({ key, label }) => (
          <Badge key={key} variant="secondary" title={`${label} — unknown (device is stale)`}>
            —
          </Badge>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {CHECK_FIELDS.map(({ key, label }) => (
        <Badge key={key} variant={device[key] ? 'default' : 'destructive'}>
          {label}
        </Badge>
      ))}
    </div>
  );
}

export const DeviceAgentDevicesList = ({ devices }: DeviceAgentDevicesListProps) => {
  const { orgId } = useParams<{ orgId: string }>();
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithChecks | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  const filteredDevices = useMemo(() => {
    if (!searchQuery) return devices;
    const query = searchQuery.toLowerCase();
    return devices.filter(
      (device) =>
        device.name.toLowerCase().includes(query) ||
        device.user.name.toLowerCase().includes(query) ||
        device.user.email.toLowerCase().includes(query) ||
        device.platform.toLowerCase().includes(query),
    );
  }, [devices, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredDevices.length / perPage));
  const paginatedDevices = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredDevices.slice(start, start + perPage);
  }, [filteredDevices, page, perPage]);

  function handleExport() {
    const contents = buildDevicesCsv(devices);
    const filename = devicesCsvFilename({ orgId });
    downloadDevicesCsv(filename, contents);
  }

  if (selectedDevice) {
    return <DeviceDetails device={selectedDevice} onClose={() => setSelectedDevice(null)} />;
  }

  if (devices.length === 0) {
    return null;
  }

  return (
    <Stack gap="4">
      <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-[300px]">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search devices..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </InputGroup>
        </div>
        <Button variant="outline" iconLeft={<Download />} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      {filteredDevices.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No devices found</EmptyTitle>
            <EmptyDescription>Try adjusting your search.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table
          variant="bordered"
          pagination={{
            page,
            pageCount,
            onPageChange: setPage,
            pageSize: perPage,
            pageSizeOptions: [25, 50, 100],
            onPageSizeChange: (size) => {
              setPerPage(size);
              setPage(1);
            },
          }}
        >
          <TableHeader>
            <TableRow>
              <TableHead>Device Name</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Last Check-in</TableHead>
              <TableHead>Checks</TableHead>
              <TableHead>Compliant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDevices.map((device) => (
              <TableRow
                key={device.id}
                onClick={() => setSelectedDevice(device)}
                style={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                        isDeviceOnline(device.lastCheckIn)
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                      title={isDeviceOnline(device.lastCheckIn) ? 'Online' : 'Offline'}
                    />
                    <Text size="sm" weight="medium">
                      {device.name}
                    </Text>
                  </div>
                </TableCell>
                <TableCell>
                  <UserNameCell device={device} orgId={orgId} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <Text size="sm">{PLATFORM_LABELS[device.platform] ?? device.platform}</Text>
                    <Text size="xs" variant="muted">
                      {device.osVersion}
                    </Text>
                  </div>
                </TableCell>
                <TableCell>
                  <Text size="sm">{formatTimeAgo(device.lastCheckIn)}</Text>
                </TableCell>
                <TableCell>
                  <CheckBadges device={device} />
                </TableCell>
                <TableCell>
                  <CompliantBadge device={device} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
};
