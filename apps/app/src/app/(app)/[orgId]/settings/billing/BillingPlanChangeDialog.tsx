'use client';

import type { BillingSku } from '@trycompai/billing';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Stack,
  Text,
} from '@trycompai/design-system';

interface ConfirmPlanChangeDialogProps {
  open: boolean;
  currentSku: BillingSku | null;
  nextSku: BillingSku;
  isUpgrade: boolean;
  isTrialing: boolean;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ConfirmPlanChangeDialog({
  open,
  currentSku,
  nextSku,
  isUpgrade,
  isTrialing,
  loading,
  onOpenChange,
  onConfirm,
}: ConfirmPlanChangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm plan change</DialogTitle>
          <DialogDescription>
            Review the billing change before updating your subscription.
          </DialogDescription>
        </DialogHeader>

        <Stack gap="3">
          <PlanChangeRow label="Current plan" sku={currentSku} />
          <PlanChangeRow label="New plan" sku={nextSku} />
          <div className="rounded-md bg-muted/30 px-3 py-2">
            <Text size="sm" weight="medium">
              {getChargeNotice({ isUpgrade, isTrialing })}
            </Text>
            <Text size="xs" variant="muted">
              {getChargeDescription({ isUpgrade, isTrialing })}
            </Text>
          </div>
        </Stack>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="default" loading={loading} onClick={onConfirm}>
            Confirm change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getChargeNotice(params: { isUpgrade: boolean; isTrialing: boolean }) {
  if (params.isUpgrade && params.isTrialing) {
    return 'Your trial will end and this upgrade will be charged immediately.';
  }
  if (params.isUpgrade) return 'This upgrade will be charged immediately.';
  return 'This change updates your subscription plan.';
}

function getChargeDescription(params: { isUpgrade: boolean; isTrialing: boolean }) {
  if (params.isUpgrade && params.isTrialing) {
    return 'Stripe will end the trial and charge the new plan now. If the payment fails, the plan will not change.';
  }
  if (params.isUpgrade) {
    return 'Stripe will charge the prorated difference for the rest of the current billing period. If the payment fails, the plan will not change.';
  }
  return 'Any billing adjustment is handled by Stripe according to the current subscription period.';
}

function PlanChangeRow({ label, sku }: { label: string; sku: BillingSku | null }) {
  const usage = sku?.includedUsage;
  const unit = usage ? formatUsageUnit(usage.unit, usage.quantity) : 'credits';

  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <Text size="xs" variant="muted">
        {label}
      </Text>
      <Text size="sm" weight="medium">
        {sku ? sku.name : 'Current plan'}
      </Text>
      <Text size="xs" variant="muted">
        {sku
          ? `${formatAmount(sku.unitAmount)} / mo with ${usage?.quantity ?? 0} ${unit}`
          : 'Existing subscription'}
      </Text>
    </div>
  );
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatUsageUnit(unit: string, quantity: number) {
  if (unit === 'scan') return quantity === 1 ? 'scan' : 'scans';
  return quantity === 1 ? 'background check' : 'background checks';
}
