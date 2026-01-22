'use client';

import { ResidualRiskForm } from '@/app/(app)/[orgId]/vendors/[vendorId]/forms/risks/ResidualRiskForm';
import { useMediaQuery } from '@comp/ui/hooks';
import type { Vendor } from '@db';
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

  const handleOpenChange = (value: boolean) => {
    setOpen(value ? 'true' : null);
  };

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Update Residual Risk</SheetTitle>
            <SheetDescription>Select the residual risk level for this vendor</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <ResidualRiskForm
              vendorId={vendorId}
              initialProbability={initialRisk?.residualProbability}
              initialImpact={initialRisk?.residualImpact}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Update Residual Risk</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          <ResidualRiskForm
            vendorId={vendorId}
            initialProbability={initialRisk?.residualProbability}
            initialImpact={initialRisk?.residualImpact}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
