'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Launch } from '@trycompai/design-system/icons';

interface BillingPaymentMethodCardProps {
  hasPaymentMethod: boolean;
  statusLabel: string;
  canManageBilling: boolean;
  isOpeningBilling: boolean;
  onOpenBilling: () => void;
}

export function BillingPaymentMethodCard({
  hasPaymentMethod,
  statusLabel,
  canManageBilling,
  isOpeningBilling,
  onOpenBilling,
}: BillingPaymentMethodCardProps) {
  const actionLabel = hasPaymentMethod ? 'Open Billing Portal' : 'Add payment method';

  return (
    <Card
      width="full"
      footer={
        <>
          <Text size="sm" variant="muted">
            Managed securely in the billing portal
          </Text>
          <Button
            type="button"
            variant="default"
            loading={isOpeningBilling}
            disabled={!canManageBilling || isOpeningBilling}
            iconRight={<Launch size={16} />}
            onClick={onOpenBilling}
          >
            {actionLabel}
          </Button>
        </>
      }
    >
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Payment method</CardTitle>
          <Badge variant={hasPaymentMethod ? 'default' : 'outline'}>{statusLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Stack gap="1">
          <Text size="sm" variant="muted" leading="relaxed">
            {hasPaymentMethod
              ? 'A payment method is connected. Open the billing portal to update billing details, cards, and receipts.'
              : 'Add a payment method to use paid services such as background checks and penetration testing.'}
          </Text>
          {!canManageBilling && (
            <Text size="sm" variant="muted">
              Ask an organization admin to update billing details.
            </Text>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
