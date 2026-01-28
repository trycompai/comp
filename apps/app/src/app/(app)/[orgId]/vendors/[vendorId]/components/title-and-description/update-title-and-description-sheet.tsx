'use client';

import { useMediaQuery } from '@comp/ui/hooks';
import type { Vendor } from '@db';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@trycompai/design-system';
import { useCallback } from 'react';

import { UpdateTitleAndDescriptionForm } from './update-title-and-description-form';

interface UpdateTitleAndDescriptionSheetProps {
  vendor: Vendor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVendorUpdated: () => void;
}

export function UpdateTitleAndDescriptionSheet({
  vendor,
  open,
  onOpenChange,
  onVendorUpdated,
}: UpdateTitleAndDescriptionSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleSuccess = useCallback(() => {
    onVendorUpdated();
    onOpenChange(false);
  }, [onOpenChange, onVendorUpdated]);

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Update Vendor</SheetTitle>
            <SheetDescription>Update the details of your vendor</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <UpdateTitleAndDescriptionForm vendor={vendor} onSuccess={handleSuccess} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Update Vendor</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          <UpdateTitleAndDescriptionForm vendor={vendor} onSuccess={handleSuccess} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
