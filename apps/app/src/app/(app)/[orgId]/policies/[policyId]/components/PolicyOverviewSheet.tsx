'use client';

import { UpdatePolicyForm } from '@/components/forms/policies/update-policy-form';
import { Button } from '@comp/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@comp/ui/drawer';
import { useMediaQuery } from '@comp/ui/hooks';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@comp/ui/sheet';
import { Policy } from '@db';
import { X } from 'lucide-react';
import { useQueryState } from 'nuqs';

export function PolicyOverviewSheet({ policy }: { policy: Policy }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useQueryState('policy-overview-sheet');
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
              <SheetTitle>{'Update Policy'}</SheetTitle>
              <Button
                size="icon"
                variant="ghost"
                className="m-0 size-auto p-0 hover:bg-transparent"
                onClick={() => setOpen(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>{' '}
            <SheetDescription>{'Update policy details, content and metadata.'}</SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
            <UpdatePolicyForm policy={policy} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTitle hidden>{'Update Policy'}</DrawerTitle>
      <DrawerContent className="p-6">
        <UpdatePolicyForm policy={policy} />
      </DrawerContent>
    </Drawer>
  );
}
