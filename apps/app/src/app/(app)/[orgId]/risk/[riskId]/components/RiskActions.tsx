'use client';

import { regenerateRiskMitigationAction } from '@/app/(app)/[orgId]/risk/[riskId]/actions/regenerate-risk-mitigation';
import { useRisk } from '@/hooks/use-risks';
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
import { useState } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';

export function RiskActions({ riskId }: { riskId: string }) {
  const { mutate: globalMutate } = useSWRConfig();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // Get SWR mutate function to refresh risk data after mutations
  const { mutate: refreshRisk } = useRisk(riskId);
  
  const regenerate = useAction(regenerateRiskMitigationAction, {
    onSuccess: () => {
      toast.success('Regeneration triggered. This may take a moment.');
      // Trigger SWR revalidation for risk detail, list views, and comments
      refreshRisk();
      globalMutate(
        (key) => Array.isArray(key) && key[0] === 'risks',
        undefined,
        { revalidate: true },
      );
      // Invalidate comments cache for this risk
      globalMutate(
        (key) => typeof key === 'string' && key.includes(`/v1/comments`) && key.includes(riskId),
        undefined,
        { revalidate: true },
      );
    },
    onError: () => toast.error('Failed to trigger mitigation regeneration'),
  });

  const handleConfirm = () => {
    setIsConfirmOpen(false);
    toast.info('Regenerating risk mitigation...');
    regenerate.execute({ riskId });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Risk actions">
            <Cog className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
              This will generate a fresh mitigation comment for this risk and mark it closed.
              Continue?
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
