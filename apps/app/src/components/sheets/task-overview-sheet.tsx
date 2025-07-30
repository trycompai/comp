'use client';

import { Button } from '@comp/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@comp/ui/drawer';
import { useMediaQuery } from '@comp/ui/hooks';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@comp/ui/sheet';
import { X } from 'lucide-react';
import { useQueryState } from 'nuqs';

import type { Task } from '@db';
import { UpdateTaskOverviewForm } from '../forms/risks/task/update-task-overview-form';

export function TaskOverviewSheet({ task }: { task: Task }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useQueryState('task-overview-sheet');
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
              <SheetTitle>{'Update Task'}</SheetTitle>
              <Button
                size="icon"
                variant="ghost"
                className="m-0 size-auto p-0 hover:bg-transparent"
                onClick={() => setOpen(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>{' '}
            <SheetDescription>{'Update task details and metadata'}</SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
            <UpdateTaskOverviewForm task={task} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTitle hidden>{'Update Risk'}</DrawerTitle>
      <DrawerContent className="p-6">
        <UpdateTaskOverviewForm task={task} />
      </DrawerContent>
    </Drawer>
  );
}
