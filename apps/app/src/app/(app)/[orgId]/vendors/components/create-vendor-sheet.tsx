'use client';

import { useMediaQuery } from '@comp/ui/hooks';
import type { Member, User } from '@db';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  ScrollArea,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useCallback, useState } from 'react';
import { CreateVendorForm } from './create-vendor-form';

export function CreateVendorSheet({
  assignees,
  organizationId,
}: {
  assignees: (Member & { user: User })[];
  organizationId: string;
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = useCallback(() => {
    setIsOpen(false);
  }, []);

  const trigger = (
    <Button iconLeft={<Add size={16} />} onClick={() => setIsOpen(true)}>
      Add Vendor
    </Button>
  );

  if (isDesktop) {
    return (
      <>
        {trigger}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Create Vendor</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <CreateVendorForm
                assignees={assignees}
                organizationId={organizationId}
                onSuccess={handleSuccess}
              />
            </SheetBody>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Create Vendor</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <CreateVendorForm
              assignees={assignees}
              organizationId={organizationId}
              onSuccess={handleSuccess}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
