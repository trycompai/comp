'use client';

import {
  Badge,
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
import { Search } from '@trycompai/design-system/icons';
import { useMemo, useState } from 'react';
import type { DeviceWithChecks } from '../types';
import { DeviceDetails } from './DeviceDetails';

export interface EmployeeDevicesListProps {
  devices: DeviceWithChecks[];
}

const CHECK_NAMES: Record<string, string> = {
  disk_encryption: 'Disk Encryption',
  antivirus: 'Antivirus',
  password_policy: 'Password Policy',
  screen_lock: 'Screen Lock',
};

const PLATFORM_LABELS: Record<string, string> = {
  macos: 'macOS',
  windows: 'Windows',
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

export const EmployeeDevicesList = ({ devices }: EmployeeDevicesListProps) => {
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithChecks | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 50;

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

  if (selectedDevice) {
    return <DeviceDetails device={selectedDevice} onClose={() => setSelectedDevice(null)} />;
  }

  if (devices.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No devices found</EmptyTitle>
          <EmptyDescription>
            Devices will appear here once employees install the device agent from the portal.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Stack gap="4">
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
            onPageSizeChange: () => setPage(1),
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
                    <Text size="sm" weight="medium">
                      {device.name}
                    </Text>
                    {device.source === 'fleet' && <Badge variant="outline">Fleet (Legacy)</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <Text size="sm" weight="medium">
                      {device.user.name}
                    </Text>
                    <Text size="xs" variant="muted">
                      {device.user.email}
                    </Text>
                  </div>
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
                  <div className="flex flex-wrap gap-1">
                    {device.checks.map((check) => (
                      <Badge
                        key={check.checkType}
                        variant={check.passed ? 'default' : 'destructive'}
                      >
                        {CHECK_NAMES[check.checkType] ?? check.checkType}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={device.isCompliant ? 'default' : 'destructive'}>
                    {device.isCompliant ? 'Yes' : 'No'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
};
