'use client';

import { ResidualRiskForm } from '@/app/(app)/[orgId]/vendors/[vendorId]/forms/risks/ResidualRiskForm';
import { Button } from '@comp/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@comp/ui/drawer';
import { useMediaQuery } from '@comp/ui/hooks';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@comp/ui/sheet';
import type { Vendor } from '@db';
import { X } from 'lucide-react';
import { useQueryState } from 'nuqs';

export function VendorResidualRiskSheet({
  vendorId,
  initialRisk,
}: {
  vendorId: string;
  initialRisk?: Vendor;
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isOpen, setOpen] = useQueryState('residual-risk-sheet');
  const open = isOpen === 'true';

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={(value) => setOpen(value ? 'true' : 'false')}>
        <SheetContent stack>
          <SheetHeader className="mb-8">
            <div className="flex flex-row items-center justify-between">
              <SheetTitle>{'Update Residual Risk'}</SheetTitle>
              <Button
                size="icon"
                variant="ghost"
                className="m-0 size-auto p-0 hover:bg-transparent"
                onClick={() => setOpen('false')}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription>{'Select the residual risk level for this vendor'}</SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
            <ResidualRiskForm
              vendorId={vendorId}
              initialProbability={initialRisk?.residualProbability}
              initialImpact={initialRisk?.residualImpact}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open}>
      <DrawerTitle hidden>{'Update Residual Risk'}</DrawerTitle>
      <DrawerContent className="p-6">
        <ResidualRiskForm
          vendorId={vendorId}
          initialProbability={initialRisk?.residualProbability}
          initialImpact={initialRisk?.residualImpact}
        />
      </DrawerContent>
    </Drawer>
  );
}
