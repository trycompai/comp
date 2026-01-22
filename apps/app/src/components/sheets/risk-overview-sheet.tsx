'use client';

import { useMediaQuery } from '@comp/ui/hooks';
import type { Risk } from '@db';
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
import { useCallback } from 'react';

import { UpdateRiskForm } from '../forms/risks/update-risk-form';

interface RiskOverviewSheetProps {
  risk: Risk;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RiskOverviewSheet({ risk, open, onOpenChange }: RiskOverviewSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleSuccess = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Update Risk</SheetTitle>
            <SheetDescription>Update risk details and metadata</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <UpdateRiskForm risk={risk} onSuccess={handleSuccess} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Update Risk</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          <UpdateRiskForm risk={risk} onSuccess={handleSuccess} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
