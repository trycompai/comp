'use client';
import { Button } from '@comp/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@comp/ui/drawer';
import { useMediaQuery } from '@comp/ui/hooks';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@comp/ui/sheet';
import { X } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { ContextForm } from './context-form';

export function CreateContextSheet() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useQueryState('create-context-sheet');
  const isOpen = Boolean(open);

  const handleOpenChange = (open: boolean) => {
    setOpen(open ? 'true' : null);
  };

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent stack className="rounded-sm">
          <SheetHeader className="mb-8 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <SheetTitle>Add Context Entry</SheetTitle>
              <Button
                size="icon"
                variant="ghost"
                className="m-0 size-auto rounded-sm p-0 hover:bg-transparent"
                onClick={() => setOpen(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription>
              Provide extra context to Comp AI about your organization.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
            <ContextForm onSuccess={() => setOpen(null)} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="rounded-sm p-6">
        <DrawerHeader>
          <DrawerTitle>Add Context Entry</DrawerTitle>
          <DrawerDescription>
            Provide extra context to Comp AI about your organization.
          </DrawerDescription>
        </DrawerHeader>
        <ContextForm onSuccess={() => setOpen(null)} />
      </DrawerContent>
    </Drawer>
  );
}
