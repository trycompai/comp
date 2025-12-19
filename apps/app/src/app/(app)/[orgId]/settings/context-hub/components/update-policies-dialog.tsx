'use client';

import { triggerPolicyUpdateFromContextAction } from '@/actions/context-hub/trigger-policy-update-from-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@comp/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import type { PolicyUpdateStatus } from '../hooks/use-policy-update-realtime';

interface UpdatePoliciesDialogProps {
  context: { id: string; question: string } | null;
  onClose: () => void;
  onRunStarted: (runId: string, accessToken: string) => void;
  status: PolicyUpdateStatus | null;
  onOpenSheet: () => void;
}

export function UpdatePoliciesDialog({
  context,
  onClose,
  onRunStarted,
  status,
  onOpenSheet,
}: UpdatePoliciesDialogProps) {
  const toastIdRef = useRef<string | number | null>(null);
  const hasTriggeredRef = useRef(false);

  const { execute, status: actionStatus } = useAction(triggerPolicyUpdateFromContextAction, {
    onSuccess: (result) => {
      if (result.data?.success && result.data.runId && result.data.publicAccessToken) {
        onRunStarted(result.data.runId, result.data.publicAccessToken);
        onClose();
      }
    },
    onError: () => {
      toast.error('Failed to trigger policy updates.');
      hasTriggeredRef.current = false;
    },
  });

  const isExecuting = actionStatus === 'executing';

  useEffect(() => {
    if (!status) return;

    const allPoliciesCompleted =
      status.affectedPoliciesInfo.length > 0 &&
      status.affectedPoliciesInfo.every(
        (p) => status.policiesStatus[p.id] === 'completed',
      );
    const countsComplete =
      status.policiesTotal > 0 &&
      status.policiesCompleted >= status.policiesTotal;
    const fullyDone = allPoliciesCompleted || countsComplete || status.isComplete;

    const getToastMessage = () => {
      if (status.phase === 'analyzing') {
        const total = status.totalPolicies > 0 ? status.totalPolicies : '?';
        return `Scanning policies... (${status.analyzedCount}/${total})`;
      }
      if (!fullyDone) {
        return `Updating ${status.affectedCount} policies (${status.policiesCompleted}/${status.policiesTotal})`;
      }
      if (fullyDone) {
        if (status.error) {
          return 'Policy update failed';
        }
        if (status.affectedCount === 0) {
          return 'No policies needed updating';
        }
        const patchedCount = status.policyDiffs.filter(d => d.sectionsModified.length > 0).length;
        if (patchedCount === 0) {
          return 'No policies were modified';
        }
        return `Patched ${patchedCount} ${patchedCount === 1 ? 'policy' : 'policies'}`;
      }
      return 'Processing...';
    };

    const message = getToastMessage();
    const patchedCount = status.policyDiffs.filter(d => d.sectionsModified.length > 0).length;

    if (fullyDone && status.phase !== 'analyzing') {
      if (toastIdRef.current) {
        if (status.error) {
          toast.error(message, { id: toastIdRef.current });
        } else {
          toast.success(message, {
            id: toastIdRef.current,
            action: patchedCount > 0 ? {
              label: 'View Details',
              onClick: () => onOpenSheet(),
            } : undefined,
          });
        }
        toastIdRef.current = null;
        hasTriggeredRef.current = false;
      }
    } else {
      if (!toastIdRef.current) {
        toastIdRef.current = toast.loading(message, {
          description: status.affectedCount > 0
            ? `${status.affectedCount} policies to process`
            : undefined,
          action: {
            label: 'View Details',
            onClick: () => onOpenSheet(),
          },
        });
      } else {
        toast.loading(message, {
          id: toastIdRef.current,
          description: status.affectedCount > 0
            ? `${status.affectedCount} policies to process`
            : undefined,
          action: {
            label: 'View Details',
            onClick: () => onOpenSheet(),
          },
        });
      }
    }
  }, [status, onOpenSheet]);

  const handleConfirm = () => {
    if (context && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      execute({ contextId: context.id });
    }
  };

  return (
    <AlertDialog open={context !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Related Policies?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                The context "{context?.question}" has been updated. Would you like to update
                policies that may be affected by this change?
              </p>
              <p className="text-destructive font-medium">
                Warning: This will overwrite existing policy content. Changes cannot be undone
                automatically.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isExecuting}>Skip</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isExecuting}>
            {isExecuting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing...
              </span>
            ) : (
              'Update Policies'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
