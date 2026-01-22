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
import { useQueryState } from 'nuqs';
import { useCallback, useEffect, useState } from 'react';

import { UpdateRiskForm } from '../forms/risks/update-risk-form';

export function RiskOverviewSheet({ risk }: { risk: Risk }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [queryOpen] = useQueryState('risk-overview-sheet');
  const [isOpen, setIsOpen] = useState(false);

  // Sync with URL query param for initial open
  useEffect(() => {
    setIsOpen(Boolean(queryOpen));
  }, [queryOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const handleSuccess = useCallback(() => {
    setIsOpen(false);
  }, []);

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
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
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
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
