'use client';

import { Button } from '@comp/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@comp/ui/drawer';
import { useMediaQuery } from '@comp/ui/hooks';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@comp/ui/sheet';
import type { Risk } from '@db';
import { T } from 'gt-next';
import { X } from 'lucide-react';
import { useQueryState } from 'nuqs';

import { UpdateRiskForm } from '../forms/risks/update-risk-form';

export function RiskOverviewSheet({ risk }: { risk: Risk }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useQueryState('risk-overview-sheet');
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
              <T>
                <SheetTitle>Update Risk</SheetTitle>
              </T>
              <Button
                size="icon"
                variant="ghost"
                className="m-0 size-auto p-0 hover:bg-transparent"
                onClick={() => setOpen(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>{' '}
            <T>
              <SheetDescription>Update risk details and metadata</SheetDescription>
            </T>
          </SheetHeader>

          <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
            <UpdateRiskForm risk={risk} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <T>
        <DrawerTitle hidden>Update Risk</DrawerTitle>
      </T>
      <DrawerContent className="p-6">
        <UpdateRiskForm risk={risk} />
      </DrawerContent>
    </Drawer>
  );
}
