'use client';

import { useMediaQuery } from '@comp/ui/hooks';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@trycompai/design-system';
import { useQueryState } from 'nuqs';
import { useCallback, useEffect, useState } from 'react';

export function CreateVendorTaskSheet() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [queryOpen] = useQueryState('create-vendor-task-sheet');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(Boolean(queryOpen));
  }, [queryOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const _handleSuccess = useCallback(() => {
    setIsOpen(false);
  }, []);

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create Vendor Task</SheetTitle>
          </SheetHeader>
          <SheetBody>{/* <CreateVendorTaskForm assignees={assignees} onSuccess={handleSuccess} /> */}</SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Create Vendor Task</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">{/* <CreateVendorTaskForm assignees={assignees} onSuccess={handleSuccess} /> */}</div>
      </DrawerContent>
    </Drawer>
  );
}
