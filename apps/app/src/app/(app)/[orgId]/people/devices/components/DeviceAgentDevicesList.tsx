'use client';

import {
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
  TableHead,
  TableHeader,
  TableRow,
} from '@trycompai/design-system';
import { Download, Search } from '@trycompai/design-system/icons';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { usePeopleActions } from '@/hooks/use-people-api';
import { usePermissions } from '@/hooks/use-permissions';
import type { DeviceWithChecks } from '../types';
import {
  buildDevicesCsv,
  devicesCsvFilename,
  downloadDevicesCsv,
} from '../lib/devices-csv';
import { DeviceTableRow } from './DeviceListCells';
import { sourceLabel } from '../lib/device-source';
import { DeviceDetails } from './DeviceDetails';
import { RemoveDeviceAlert } from '../../all/components/RemoveDeviceAlert';

export interface DeviceAgentDevicesListProps {
  devices: DeviceWithChecks[];
}

export const DeviceAgentDevicesList = ({
  devices,
}: DeviceAgentDevicesListProps) => {
  const { orgId } = useParams<{ orgId: string }>();
  const { removeDeviceAgent } = usePeopleActions();
  const { hasPermission } = usePermissions();
  const canRemoveDevice = hasPermission('member', 'delete');
  const { mutate } = useSWRConfig();
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithChecks | null>(null);
  const [actionDevice, setActionDevice] = useState<DeviceWithChecks | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [isRemoveDeviceAlertOpen, setIsRemoveDeviceAlertOpen] = useState(false);
  const [isRemovingDevice, setIsRemovingDevice] = useState(false);

  // Distinct source labels present, so the filter only offers sources that exist
  // (e.g. "Comp Agent", "Kandji").
  const sourceOptions = useMemo(() => {
    const labels = new Set(devices.map((d) => sourceLabel(d)));
    return Array.from(labels).sort();
  }, [devices]);

  const filteredDevices = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return devices.filter((device) => {
      if (sourceFilter !== 'all' && sourceLabel(device) !== sourceFilter) {
        return false;
      }
      if (!query) return true;
      return (
        device.name.toLowerCase().includes(query) ||
        device.user.name.toLowerCase().includes(query) ||
        device.user.email.toLowerCase().includes(query) ||
        device.platform.toLowerCase().includes(query)
      );
    });
  }, [devices, searchQuery, sourceFilter]);

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
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:max-w-[520px]">
          <div className="w-full sm:max-w-[300px]">
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
          {(sourceOptions.length > 1 || sourceFilter !== 'all') && (
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              aria-label="Filter by source"
            >
              <option value="all">All sources</option>
              {sourceOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          )}
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
              <TableHead>Source</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead>Checks</TableHead>
              <TableHead>Compliant</TableHead>
              <TableHead>ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDevices.map((device) => (
              <DeviceTableRow
                key={device.id}
                device={device}
                orgId={orgId}
                canRemoveDevice={canRemoveDevice}
                onSelect={setSelectedDevice}
                onRequestRemove={(d) => {
                  setActionDevice(d);
                  setIsRemoveDeviceAlertOpen(true);
                }}
              />
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
            {actionDevice?.source === 'integration' && (
              <>
                {' '}
                It was imported from{' '}
                <strong>{actionDevice.integrationProvider?.name ?? 'an integration'}</strong>{' '}
                and may be re-added on the next sync.
              </>
            )}
          </>
        }
        onOpenChange={setIsRemoveDeviceAlertOpen}
        onRemove={handleRemoveDevice}
        isRemoving={isRemovingDevice}
      />
    </Stack>
  );
};
