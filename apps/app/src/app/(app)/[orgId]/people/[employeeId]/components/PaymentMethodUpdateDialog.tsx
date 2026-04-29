'use client';

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Stack,
  Text,
} from '@trycompai/design-system';

export function PaymentMethodUpdateDialog({
  canManageBilling,
  isOpeningBilling,
  issue,
  open,
  onOpenChange,
  onUpdatePaymentMethod,
}: {
  canManageBilling: boolean;
  isOpeningBilling: boolean;
  issue: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePaymentMethod: () => void;
}) {
  const description =
    issue ?? 'The saved payment method could not be charged for this background check.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update payment method</DialogTitle>
          <DialogDescription>
            We could not complete the background check purchase.
          </DialogDescription>
        </DialogHeader>
        <Stack gap="sm">
          <Text size="sm">{description}</Text>
          {!canManageBilling && (
            <Text size="sm" variant="muted">
              Ask an organization admin to update the saved payment method before trying again.
            </Text>
          )}
        </Stack>
        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="secondary" disabled={isOpeningBilling} />}
          >
            Not now
          </DialogClose>
          {canManageBilling && (
            <Button
              type="button"
              loading={isOpeningBilling}
              disabled={isOpeningBilling}
              onClick={onUpdatePaymentMethod}
            >
              Update payment method
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
