'use client';

import { useMediaQuery } from '@comp/ui/hooks';
import type { Member, User } from '@db';
import {
  Button,
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
import { Add } from '@trycompai/design-system/icons';
import { useCallback, useState } from 'react';
import { CreateRisk } from '../forms/risks/create-risk-form';

export function CreateRiskSheet({ assignees }: { assignees: (Member & { user: User })[] }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = useCallback(() => {
    setIsOpen(false);
  }, []);

  const trigger = (
    <Button iconLeft={<Add size={16} />} onClick={() => setIsOpen(true)}>
      Create Risk
    </Button>
  );

  if (isDesktop) {
    return (
      <>
        {trigger}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Create New Risk</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <CreateRisk assignees={assignees} onSuccess={handleSuccess} />
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
            <DrawerTitle>Create New Risk</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <CreateRisk assignees={assignees} onSuccess={handleSuccess} />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
