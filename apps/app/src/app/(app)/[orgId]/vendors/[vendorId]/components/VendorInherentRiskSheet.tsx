'use client';

import { InherentRiskForm } from '@/app/(app)/[orgId]/vendors/[vendorId]/forms/risks/InherentRiskForm';
import { Button } from '@comp/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@comp/ui/drawer';
import { useMediaQuery } from '@comp/ui/hooks';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@comp/ui/sheet';
import { Impact, Likelihood } from '@db';
import { X } from 'lucide-react';
import { useQueryState } from 'nuqs';

export function VendorInherentRiskSheet({
  vendorId,
  initialProbability,
  initialImpact,
}: {
  vendorId: string;
  initialProbability?: Likelihood;
  initialImpact?: Impact;
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isOpen, setOpen] = useQueryState('inherent-risk-sheet');

  if (isDesktop) {
    return (
      <Sheet open={isOpen === 'true'} onOpenChange={(value) => setOpen(value ? 'true' : null)}>
        <SheetContent stack>
          <SheetHeader className="mb-8">
            <div className="flex flex-row items-center justify-between">
              <SheetTitle>{'Update Inherent Risk'}</SheetTitle>
              <Button
                size="icon"
                variant="ghost"
                className="m-0 size-auto p-0 hover:bg-transparent"
                onClick={() => setOpen(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription>{'Select the inherent risk level for this vendor'}</SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
            <InherentRiskForm
              vendorId={vendorId}
              initialProbability={initialProbability}
              initialImpact={initialImpact}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen === 'true'} onOpenChange={(value) => setOpen(value ? 'true' : null)}>
      <DrawerTitle hidden>{'Update Inherent Risk'}</DrawerTitle>
      <DrawerContent className="p-6">
        <InherentRiskForm
          vendorId={vendorId}
          initialProbability={initialProbability}
          initialImpact={initialImpact}
        />
      </DrawerContent>
    </Drawer>
  );
}
