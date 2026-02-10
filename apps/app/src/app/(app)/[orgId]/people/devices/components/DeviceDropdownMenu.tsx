'use client';

import { Button } from '@comp/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Laptop, MoreHorizontal } from 'lucide-react';
import { Host } from '../types';
import { RemoveDeviceAlert } from '../../all/components/RemoveDeviceAlert';
import { useState } from 'react';
import { toast } from 'sonner';
import { useDevices } from '../hooks/useDevices';

interface DeviceDropdownMenuProps {
  host: Host;
  isCurrentUserOwner: boolean;
}

export const DeviceDropdownMenu = ({ host, isCurrentUserOwner }: DeviceDropdownMenuProps) => {
  const [isRemoveDeviceAlertOpen, setIsRemoveDeviceAlertOpen] = useState(false);
  const [isRemovingDevice, setIsRemovingDevice] = useState(false);

  const { removeDevice } = useDevices();

  if (!isCurrentUserOwner || !host.member_id) {
    return null;
  }

  const memberId = host.member_id;

  const handleRemoveDeviceClick = async () => {
    try {
      setIsRemovingDevice(true);
      await removeDevice(memberId, host.id);
      setIsRemoveDeviceAlertOpen(false);
      toast.success('Device removed successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove device');
    } finally {
      setIsRemovingDevice(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setIsRemoveDeviceAlertOpen(true)}>
            <Laptop className="mr-2 h-4 w-4" />
            <span>{'Remove Device'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RemoveDeviceAlert
        open={isRemoveDeviceAlertOpen}
        title="Remove Device"
        description={(
          <>
            {'Are you sure you want to remove this device '} <strong>{host.computer_name}</strong>?{' '}
            {'This will disconnect the device from the user.'}
          </>
        )}
        onOpenChange={setIsRemoveDeviceAlertOpen}
        onRemove={handleRemoveDeviceClick}
        isRemoving={isRemovingDevice}
      />
    </div>
  );
};
