'use client';

import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Loader2 } from 'lucide-react';

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  currentPeriodEnd?: number;
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  currentPeriodEnd,
}: CancelSubscriptionDialogProps) {
  const formattedDate = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription className="space-y-3 pt-3">
            <p>Are you sure you want to cancel your subscription?</p>
            {formattedDate && (
              <p className="text-sm">
                Your subscription will remain active until{' '}
                <span className="font-medium">{formattedDate}</span>. You can resume your
                subscription at any time before this date.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              You'll lose access to all premium features after your current billing period ends.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
            }}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel Subscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
