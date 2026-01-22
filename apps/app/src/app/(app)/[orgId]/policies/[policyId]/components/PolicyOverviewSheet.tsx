'use client';

import { UpdatePolicyForm } from '@/components/forms/policies/update-policy-form';
import type { Policy } from '@db';
import { useMediaQuery } from '@comp/ui/hooks';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@trycompai/design-system';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function PolicyOverviewSheet({ policy }: { policy: Policy }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  // Sync from URL param on mount and when URL changes
  useEffect(() => {
    const urlOpen = searchParams.get('policy-overview-sheet') === 'true';
    setIsOpen(urlOpen);
  }, [searchParams]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    // Also update URL
    const params = new URLSearchParams(searchParams.toString());
    if (open) {
      params.set('policy-overview-sheet', 'true');
    } else {
      params.delete('policy-overview-sheet');
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSuccess = () => {
    setIsOpen(false);
    // Clean up URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('policy-overview-sheet');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Update Policy</SheetTitle>
            <SheetDescription>Update policy details, content and metadata.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <UpdatePolicyForm policy={policy} onSuccess={handleSuccess} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTitle hidden>Update Policy</DrawerTitle>
      <DrawerContent>
        <UpdatePolicyForm policy={policy} onSuccess={handleSuccess} />
      </DrawerContent>
    </Drawer>
  );
}
