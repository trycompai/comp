'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import { Button } from '@trycompai/ui/button';
import { useApi } from '@/hooks/use-api';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const MIN_REASON_LENGTH = 20;

export interface MarkExceptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  findingId: string | null;
  findingTitle: string;
  resourceLabel?: string | null;
  onMarked?: () => void;
}

/**
 * Modal that captures the reason + optional reviewer + optional expiration
 * date for marking a finding as an exception. Talks to POST
 * /v1/cloud-security/findings/:id/exception. Calls onMarked() on success
 * so the parent can refresh its findings list.
 */
export function MarkExceptionModal({
  open,
  onOpenChange,
  findingId,
  findingTitle,
  resourceLabel,
  onMarked,
}: MarkExceptionModalProps) {
  const api = useApi();
  const [reason, setReason] = useState('');
  const [reviewedBy, setReviewedBy] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reasonTooShort = reason.trim().length < MIN_REASON_LENGTH;

  const handleSubmit = async () => {
    if (!findingId || reasonTooShort) return;
    setSubmitting(true);
    const response = await api.post(
      `/v1/cloud-security/findings/${findingId}/exception`,
      {
        reason: reason.trim(),
        reviewedBy: reviewedBy.trim() || undefined,
        expiresAt: expiresAt || undefined,
      },
    );
    setSubmitting(false);

    if (response.error) {
      const message =
        typeof response.error === 'string'
          ? response.error
          : 'Could not mark exception — please try again.';
      toast.error(message);
      return;
    }

    toast.success('Marked as exception');
    setReason('');
    setReviewedBy('');
    setExpiresAt('');
    onMarked?.();
    onOpenChange(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setReason('');
      setReviewedBy('');
      setExpiresAt('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark this finding as an exception?</DialogTitle>
          <DialogDescription>
            Exceptions are recorded in the audit trail. Auditors will see this
            exception and the reason you provide.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <p className="font-medium">{findingTitle}</p>
            {resourceLabel && (
              <p className="text-muted-foreground mt-0.5">{resourceLabel}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="exception-reason"
              className="block text-xs font-medium mb-1"
            >
              Reason for exception (required) *
            </label>
            <textarea
              id="exception-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. This bucket hosts our public marketing assets. Public read access is intentional."
              className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p
              className={`mt-1 text-[10px] ${
                reasonTooShort
                  ? 'text-muted-foreground'
                  : 'text-primary'
              }`}
            >
              {reason.trim().length}/{MIN_REASON_LENGTH}+ characters
              {reasonTooShort && ' — please be specific'}
            </p>
          </div>

          <div>
            <label
              htmlFor="exception-reviewer"
              className="block text-xs font-medium mb-1"
            >
              Reviewed by (optional)
            </label>
            <input
              id="exception-reviewer"
              type="text"
              value={reviewedBy}
              onChange={(e) => setReviewedBy(e.target.value)}
              placeholder='e.g. "Approved by CISO 2026-Q1"'
              className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label
              htmlFor="exception-expires"
              className="block text-xs font-medium mb-1"
            >
              Auto-review on (optional)
            </label>
            <input
              id="exception-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date(Date.now() + 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10)}
              className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-muted-foreground mt-1 text-[10px]">
              Leave empty for never. If set, the finding reappears in Scan
              Results on the first scan after this date.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={reasonTooShort || submitting || !findingId}
          >
            {submitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Mark as exception
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
