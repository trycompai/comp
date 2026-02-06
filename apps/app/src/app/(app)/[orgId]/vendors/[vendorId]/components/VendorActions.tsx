'use client';

import { useApi } from '@/hooks/use-api';
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
import { useState } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';

interface VendorActionsProps {
  vendorId: string;
  onOpenEditSheet: () => void;
  onAssessmentTriggered?: (runId: string, publicAccessToken: string) => void;
}

export function VendorActions({
  vendorId,
  onOpenEditSheet,
  onAssessmentTriggered,
}: VendorActionsProps) {
  const api = useApi();
  const { mutate: globalMutate } = useSWRConfig();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isAssessmentConfirmOpen, setIsAssessmentConfirmOpen] = useState(false);
  const [isAssessmentSubmitting, setIsAssessmentSubmitting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Get SWR mutate function to refresh vendor data after mutations
  const { mutate: refreshVendor } = useVendor(vendorId);

  const handleConfirm = async () => {
    setIsConfirmOpen(false);
    setIsRegenerating(true);
    toast.info('Regenerating vendor risk mitigation...');
    try {
      const response = await fetch(`/api/vendors/${vendorId}/regenerate-mitigation`, {
        method: 'POST',
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to trigger mitigation regeneration');
      }
      toast.success('Regeneration triggered. This may take a moment.');
      refreshVendor();
      globalMutate((key) => Array.isArray(key) && key[0] === 'vendors', undefined, {
        revalidate: true,
      });
      // Invalidate comments cache for this vendor
      globalMutate(
        (key) => typeof key === 'string' && key.includes(`/v1/comments`) && key.includes(vendorId),
        undefined,
        { revalidate: true },
      );
    } catch {
      toast.error('Failed to trigger mitigation regeneration');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAssessmentConfirm = async () => {
    setIsAssessmentConfirmOpen(false);
    setIsAssessmentSubmitting(true);
    toast.info('Regenerating vendor risk assessment...');
    try {
      const response = await api.post<{ success: boolean; runId: string; publicAccessToken: string }>(`/v1/vendors/${vendorId}/trigger-assessment`, {});
      if (response.error) throw new Error(response.error);
      toast.success('Assessment regeneration triggered. This may take a moment.');
      refreshVendor();
      globalMutate((key) => Array.isArray(key) && key[0] === 'vendors', undefined, {
        revalidate: true,
      });
      // Notify parent with run info for real-time tracking
      if (response.data?.runId && response.data?.publicAccessToken) {
        onAssessmentTriggered?.(response.data.runId, response.data.publicAccessToken);
      }
    } catch {
      toast.error('Failed to trigger risk assessment regeneration');
    } finally {
      setIsAssessmentSubmitting(false);
    }
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
            Mitigation
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsAssessmentConfirmOpen(true)}>
            <Renew size={16} />
            Assessment
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
            <AlertDialogCancel disabled={isRegenerating}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isRegenerating}>
              {isRegenerating ? 'Working\u2026' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAssessmentConfirmOpen} onOpenChange={setIsAssessmentConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              This will regenerate the risk assessment for this vendor. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAssessmentSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAssessmentConfirm}
              disabled={isAssessmentSubmitting}
            >
              {isAssessmentSubmitting ? 'Working\u2026' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
