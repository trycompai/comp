'use client';

import { regenerateVendorMitigationAction } from '@/app/(app)/[orgId]/vendors/[vendorId]/actions/regenerate-vendor-mitigation';
import { useVendor } from '@/hooks/use-vendors';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Cog } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';

export function VendorActions({ vendorId }: { vendorId: string }) {
  const [_, setOpen] = useQueryState('vendor-overview-sheet');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Get SWR mutate function to refresh vendor data after mutations
  const { mutate: refreshVendor } = useVendor(vendorId);

  const regenerate = useAction(regenerateVendorMitigationAction, {
    onSuccess: () => {
      toast.success('Regeneration triggered. This may take a moment.');
      // Trigger SWR revalidation to refresh vendor data
      refreshVendor();
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
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Vendor actions">
            <Cog className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setOpen('true')}>
            Edit vendor name and description
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsConfirmOpen(true)}>
            Regenerate Risk Mitigation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isConfirmOpen} onOpenChange={(open) => !open && setIsConfirmOpen(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Regenerate Mitigation</DialogTitle>
            <DialogDescription>
              This will generate a fresh risk mitigation comment for this vendor and mark it
              assessed. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={regenerate.status === 'executing'}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={regenerate.status === 'executing'}>
              {regenerate.status === 'executing' ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
