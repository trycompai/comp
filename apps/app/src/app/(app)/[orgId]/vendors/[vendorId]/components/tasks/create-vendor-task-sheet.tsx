'use client';

import { Button } from '@trycompai/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@trycompai/ui/drawer';
import { useMediaQuery } from '@trycompai/ui/hooks';
import { ScrollArea } from '@trycompai/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@trycompai/ui/sheet';
import { X } from 'lucide-react';
import { useQueryState } from 'nuqs';
// import { CreateVendorTaskForm } from "./create-vendor-task-form";

export function CreateVendorTaskSheet() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useQueryState('create-vendor-task-sheet');
  const isOpen = Boolean(open);

  const handleOpenChange = (open: boolean) => {
    setOpen(open ? 'true' : null);
  };

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent stack>
          <SheetHeader className="mb-8 flex flex-row items-center justify-between">
            <SheetTitle>{'Create Vendor Task'}</SheetTitle>
            <Button
              size="icon"
              variant="ghost"
              className="m-0 size-auto p-0 hover:bg-transparent"
              onClick={() => setOpen(null)}
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetHeader>

          <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
            {/* <CreateVendorTaskForm assignees={assignees} /> */}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTitle hidden>{'Create Vendor Task'}</DrawerTitle>
      <DrawerContent className="p-6">
        {/* <CreateVendorTaskForm assignees={assignees} /> */}
      </DrawerContent>
    </Drawer>
  );
}
