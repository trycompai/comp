'use client';

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import {
  Download,
  Information,
  OverflowMenuVertical,
  Search,
  TrashCan,
} from '@trycompai/design-system/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@trycompai/ui/tooltip';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import type { DeviceWithChecks } from '../types';
import {
  buildDevicesCsv,
  devicesCsvFilename,
  downloadDevicesCsv,
} from '../lib/devices-csv';
import { useDevices } from '../hooks/useDevices';
import { DeviceDetails } from './DeviceDetails';
import { RemoveDeviceAlert } from '../../all/components/RemoveDeviceAlert';

export interface DeviceAgentDevicesListProps {
  devices: DeviceWithChecks[];
  isCurrentUserOwner: boolean;
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

function staleTooltipCopy(daysSinceLastCheckIn: number | null): string {
  return daysSinceLastCheckIn === null
    ? "This device was registered but hasn't sent a compliance check yet. If it's not new, the agent may not be running or the device may be offline."
    : "This device hasn't reported to CompAI in over 7 days, so we can't verify its current compliance. It may be offline, the agent may need to be updated, or the device may no longer be in use. Check with the employee.";
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
      <div className="flex items-center gap-1">
        <Badge variant="secondary">{staleLabel(device.daysSinceLastCheckIn)}</Badge>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="What does Stale mean?"
                className="inline-flex items-center text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <Information size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              {staleTooltipCopy(device.daysSinceLastCheckIn)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
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

export const DeviceAgentDevicesList = ({
  devices,
  isCurrentUserOwner,
}: DeviceAgentDevicesListProps) => {
  const { orgId } = useParams<{ orgId: string }>();
  const { removeDeviceAgent } = useDevices();
  const { mutate } = useSWRConfig();
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithChecks | null>(null);
  const [actionDevice, setActionDevice] = useState<DeviceWithChecks | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [isRemoveDeviceAlertOpen, setIsRemoveDeviceAlertOpen] = useState(false);
  const [isRemovingDevice, setIsRemovingDevice] = useState(false);

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

  async function handleRemoveDevice() {
    if (!actionDevice) return;
    setIsRemovingDevice(true);
    try {
      await removeDeviceAgent(actionDevice.id);
      await mutate(
        ['people-agent-devices', orgId],
        (currentDevices: DeviceWithChecks[] | undefined) =>
          Array.isArray(currentDevices)
            ? currentDevices.filter((device) => device.id !== actionDevice.id)
            : currentDevices,
        false,
      );
      toast.success('Device removed successfully');
      if (selectedDevice?.id === actionDevice.id) {
        setSelectedDevice(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove device');
    } finally {
      setIsRemovingDevice(false);
      setIsRemoveDeviceAlertOpen(false);
      setActionDevice(null);
    }
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
              <TableHead>ACTIONS</TableHead>
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
                <TableCell>
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <OverflowMenuVertical />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={!isCurrentUserOwner}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionDevice(device);
                            setIsRemoveDeviceAlertOpen(true);
                          }}
                          variant="destructive"
                        >
                          <TrashCan size={16} className="mr-2" />
                          <span>Remove Device</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <RemoveDeviceAlert
        open={isRemoveDeviceAlertOpen}
        title="Remove Device"
        description={
          <>
            Are you sure you want to remove this device{' '}
            <strong>{actionDevice?.name ?? 'device'}</strong>?
          </>
        }
        onOpenChange={setIsRemoveDeviceAlertOpen}
        onRemove={handleRemoveDevice}
        isRemoving={isRemovingDevice}
      />
    </Stack>
  );
};
