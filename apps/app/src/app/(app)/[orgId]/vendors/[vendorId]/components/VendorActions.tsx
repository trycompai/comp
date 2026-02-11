'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { useVendor, useVendorActions } from '@/hooks/use-vendors';
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
  const { hasPermission } = usePermissions();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isAssessmentConfirmOpen, setIsAssessmentConfirmOpen] = useState(false);
  const [isAssessmentSubmitting, setIsAssessmentSubmitting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Get SWR mutate function to refresh vendor data after mutations
  const { mutate: refreshVendor } = useVendor(vendorId);
  const { triggerAssessment, regenerateMitigation } = useVendorActions();

  const handleConfirm = async () => {
    setIsConfirmOpen(false);
    setIsRegenerating(true);
    toast.info('Regenerating vendor risk mitigation...');
    try {
      await regenerateMitigation(vendorId);
      toast.success('Regeneration triggered. This may take a moment.');
      refreshVendor();
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
      const result = await triggerAssessment(vendorId);
      toast.success('Assessment regeneration triggered. This may take a moment.');
      refreshVendor();
      // Notify parent with run info for real-time tracking
      if (result.runId && result.publicAccessToken) {
        onAssessmentTriggered?.(result.runId, result.publicAccessToken);
      }
    } catch {
      toast.error('Failed to trigger risk assessment regeneration');
    } finally {
      setIsAssessmentSubmitting(false);
    }
  };

  if (!hasPermission('vendor', 'update')) return null;

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
