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
import { useQueryState } from 'nuqs';
import { useCallback, useEffect, useState } from 'react';

import { UpdateTitleAndDescriptionForm } from './update-title-and-description-form';

export function UpdateTitleAndDescriptionSheet({ vendor }: { vendor: Vendor }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [queryOpen] = useQueryState('vendor-overview-sheet');
  const [isOpen, setIsOpen] = useState(false);

  // Sync with URL query param for initial open
  useEffect(() => {
    setIsOpen(Boolean(queryOpen));
  }, [queryOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const handleSuccess = useCallback(() => {
    setIsOpen(false);
  }, []);

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
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
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
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
