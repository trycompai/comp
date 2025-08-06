'use client';

import { Button } from '@comp/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@comp/ui/drawer';
import { useMediaQuery } from '@comp/ui/hooks';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@comp/ui/sheet';
import { T } from 'gt-next';
import { Member, User } from '@db';
import { X } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { CreateRisk } from '../forms/risks/create-risk-form';

export function CreateRiskSheet({ assignees }: { assignees: (Member & { user: User })[] }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useQueryState('create-risk-sheet');
  const isOpen = Boolean(open);

  const handleOpenChange = (open: boolean) => {
    setOpen(open ? 'true' : null);
  };

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent stack>
          <SheetHeader className="mb-8 flex flex-row items-center justify-between">
            <T><SheetTitle>Create New Risk</SheetTitle></T>
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
            <CreateRisk assignees={assignees} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <T><DrawerTitle hidden>Create New Risk</DrawerTitle></T>
      <DrawerContent className="p-6">
        <CreateRisk assignees={assignees} />
      </DrawerContent>
    </Drawer>
  );
}
