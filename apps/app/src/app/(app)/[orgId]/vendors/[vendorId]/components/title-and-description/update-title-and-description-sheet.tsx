'use client';

import { Button } from '@comp/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@comp/ui/drawer';
import { useMediaQuery } from '@comp/ui/hooks';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@comp/ui/sheet';
import type { Vendor } from '@db';
import { T } from 'gt-next';
import { X } from 'lucide-react';
import { useQueryState } from 'nuqs';

import { UpdateTitleAndDescriptionForm } from './update-title-and-description-form';

export function UpdateTitleAndDescriptionSheet({ vendor }: { vendor: Vendor }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useQueryState('vendor-overview-sheet');
  const isOpen = Boolean(open);

  const handleOpenChange = (open: boolean) => {
    setOpen(open ? 'true' : null);
  };

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent stack>
          <SheetHeader className="mb-8">
            <div className="flex flex-row items-center justify-between">
              <SheetTitle>
                <T>Update Vendor</T>
              </SheetTitle>
              <Button
                size="icon"
                variant="ghost"
                className="m-0 size-auto p-0 hover:bg-transparent"
                onClick={() => setOpen(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>{' '}
            <SheetDescription>
              <T>Update the details of your vendor</T>
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
            <UpdateTitleAndDescriptionForm vendor={vendor} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTitle hidden>
        <T>Update Vendor</T>
      </DrawerTitle>
      <DrawerContent className="p-6">
        <UpdateTitleAndDescriptionForm vendor={vendor} />
      </DrawerContent>
    </Drawer>
  );
}
