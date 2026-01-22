'use client';

import { InherentRiskForm } from '@/app/(app)/[orgId]/vendors/[vendorId]/forms/risks/InherentRiskForm';
import { useMediaQuery } from '@comp/ui/hooks';
import { Impact, Likelihood } from '@db';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@trycompai/design-system';
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

  const handleOpenChange = (value: boolean) => {
    setOpen(value ? 'true' : null);
  };

  if (isDesktop) {
    return (
      <Sheet open={isOpen === 'true'} onOpenChange={handleOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Update Inherent Risk</SheetTitle>
            <SheetDescription>Select the inherent risk level for this vendor</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <InherentRiskForm
              vendorId={vendorId}
              initialProbability={initialProbability}
              initialImpact={initialImpact}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen === 'true'} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Update Inherent Risk</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          <InherentRiskForm
            vendorId={vendorId}
            initialProbability={initialProbability}
            initialImpact={initialImpact}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
