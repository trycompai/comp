'use client';

import { useApi } from '@/hooks/use-api';
import { Button } from '@trycompai/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { mutate as globalMutate } from 'swr';

import {
  type AwsScanModeChoice,
} from '../../integrations/[slug]/components/AwsScanModeStep';

const MODE_LABEL: Record<AwsScanModeChoice, string> = {
  comp_scanners: 'Comp AI Scanners',
  security_hub: 'AWS Security Hub',
};

export interface ScanModeSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  currentMode: AwsScanModeChoice;
  targetMode: AwsScanModeChoice;
  /** Called after a successful switch so the parent can refetch. */
  onSwitched?: () => void;
}

/**
 * Confirmation dialog for switching the AWS scan engine on an existing
 * connection. Posts to `PATCH /v1/cloud-security/connections/:id/scan-mode`
 * and invalidates SWR caches so the findings list + history tab pick up
 * the change on the next scan.
 *
 * Switching is non-destructive but has real consequences worth flagging:
 *   1. The next scan is a fresh baseline — reconciliation only diffs
 *      same-mode runs (see reconciliation.service.ts), so the customer
 *      shouldn't expect "resolved" events from the prior engine.
 *   2. Existing exceptions stay in the database but may not match
 *      findings from the new engine (different checkId namespaces).
 */
export function ScanModeSwitchDialog({
  open,
  onOpenChange,
  connectionId,
  currentMode,
  targetMode,
  onSwitched,
}: ScanModeSwitchDialogProps) {
  const api = useApi();
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    const response = await api.patch(
      `/v1/cloud-security/connections/${connectionId}/scan-mode`,
      { mode: targetMode },
    );
    setSubmitting(false);

    if (response.error) {
      const message =
        typeof response.error === 'string'
          ? response.error
          : 'Could not switch scan engine — please try again.';
      toast.error(message);
      return;
    }

    toast.success(`Scan engine switched to ${MODE_LABEL[targetMode]}`);
    // Invalidate any cached findings + history for this connection so the
    // UI re-fetches with the new mode on the next access.
    globalMutate(
      (key) =>
        Array.isArray(key) &&
        typeof key[0] === 'string' &&
        (key[0].startsWith('/v1/cloud-security/findings') ||
          key[0].startsWith('/v1/cloud-security/history') ||
          key[0].startsWith('/v1/cloud-security/providers')),
    );
    onSwitched?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Switch scan engine?</DialogTitle>
          <DialogDescription>
            Change which engine produces findings for this AWS connection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">From</p>
              <p className="font-medium">{MODE_LABEL[currentMode]}</p>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">To</p>
              <p className="font-medium">{MODE_LABEL[targetMode]}</p>
            </div>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-medium">What changes:</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>
                The next scan is a fresh baseline — resolutions and
                regressions only compare same-engine runs.
              </li>
              <li>
                Existing exceptions stay marked but may not match findings
                from the new engine (different control identifiers).
              </li>
              <li>
                In-flight remediations from the previous engine continue
                independently.
              </li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={submitting}>
            {submitting && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            Switch to {MODE_LABEL[targetMode]}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
