'use client';

import { regenerateVendorMitigationAction } from '@/app/(app)/[orgId]/vendors/[vendorId]/actions/regenerate-vendor-mitigation';
import { useVendor } from '@/hooks/use-vendors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@trycompai/design-system';
import { Edit, OverflowMenuVertical, Renew } from '@trycompai/design-system/icons';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';

interface VendorActionsProps {
  vendorId: string;
  orgId: string;
  onOpenEditSheet: () => void;
}

export function VendorActions({ vendorId, orgId, onOpenEditSheet }: VendorActionsProps) {
  const { mutate: globalMutate } = useSWRConfig();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Get SWR mutate function to refresh vendor data after mutations
  // Pass orgId to ensure same cache key as VendorPageClient
  const { mutate: refreshVendor } = useVendor(vendorId, { organizationId: orgId });

  const regenerate = useAction(regenerateVendorMitigationAction, {
    onSuccess: () => {
      toast.success('Regeneration triggered. This may take a moment.');
      // Trigger SWR revalidation for vendor detail, list views, and comments
      refreshVendor();
      globalMutate(
        (key) => Array.isArray(key) && key[0] === 'vendors',
        undefined,
        { revalidate: true },
      );
      // Invalidate comments cache for this vendor
      globalMutate(
        (key) => typeof key === 'string' && key.includes(`/v1/comments`) && key.includes(vendorId),
        undefined,
        { revalidate: true },
      );
    },
    onError: () => toast.error('Failed to trigger mitigation regeneration'),
  });

  const handleConfirm = () => {
    setIsConfirmOpen(false);
    toast.info('Regenerating vendor risk mitigation...');
    regenerate.execute({ vendorId });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger variant="ellipsis">
          <OverflowMenuVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onOpenEditSheet}>
            <Edit size={16} />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsConfirmOpen(true)}>
            <Renew size={16} />
            Regenerate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Mitigation</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a fresh risk mitigation comment for this vendor and mark it
              assessed. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerate.status === 'executing'}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={regenerate.status === 'executing'}
            >
              {regenerate.status === 'executing' ? 'Working…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
