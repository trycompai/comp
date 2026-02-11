'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { useRisk } from '@/hooks/use-risks';
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
import { Settings } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';

export function RiskActions({ riskId, orgId }: { riskId: string; orgId: string }) {
  const { hasPermission } = usePermissions();
  const { mutate: globalMutate } = useSWRConfig();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const { mutate: refreshRisk } = useRisk(riskId);

  if (!hasPermission('risk', 'update')) return null;

  const handleConfirm = async () => {
    setIsConfirmOpen(false);
    setIsRegenerating(true);
    toast.info('Regenerating risk mitigation...');

    try {
      const response = await fetch(`/api/risks/${riskId}/regenerate-mitigation`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed');
      }
      toast.success('Regeneration triggered. This may take a moment.');
      refreshRisk();
      globalMutate(
        (key) => Array.isArray(key) && key[0] === 'risks',
        undefined,
        { revalidate: true },
      );
      globalMutate(
        (key) =>
          typeof key === 'string' &&
          key.includes('/v1/comments') &&
          key.includes(riskId),
        undefined,
        { revalidate: true },
      );
    } catch {
      toast.error('Failed to trigger mitigation regeneration');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger variant="ellipsis">
          <Settings size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsConfirmOpen(true)}>
            Regenerate Risk Mitigation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Mitigation</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a fresh mitigation comment for this risk and mark it closed.
              Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRegenerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isRegenerating}>
              {isRegenerating ? 'Working...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
