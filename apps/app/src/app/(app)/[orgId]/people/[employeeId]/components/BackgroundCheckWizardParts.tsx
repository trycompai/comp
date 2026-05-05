'use client';

import { Button, HStack, Stack, Text } from '@trycompai/design-system';
import { CheckmarkFilled, Launch } from '@trycompai/design-system/icons';
import Link from 'next/link';

const BENEFITS = [
  'Required for Compliance',
  'Full audited report / background check',
  'Identity verification',
  'Previous employer verification + checks',
  'Reference checks',
  'Social media verifications',
];

export function OverviewStep({
  canRequest,
  canManageBilling,
  hasPaymentMethod,
  isOpeningBilling,
  billingHref,
  onGetStarted,
  onOpenBilling,
}: {
  canRequest: boolean;
  canManageBilling: boolean;
  hasPaymentMethod: boolean;
  isOpeningBilling: boolean;
  billingHref: string;
  onGetStarted: () => void;
  onOpenBilling: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
        <div className="p-6">
          <BackgroundCheckSummary />
        </div>
        <div className="border-t bg-muted/20 p-6 lg:border-l lg:border-t-0">
          <Stack gap="4">
            <Stack gap="1">
              <Text size="sm" variant="muted">Plans from</Text>
              <Text size="lg" weight="semibold">
                $79 / month
              </Text>
            </Stack>
            <Text size="sm" variant="muted">
              The candidate receives a secure invite and Comp AI keeps the result attached to this
              employee profile.
            </Text>
            {hasPaymentMethod ? (
              <Button type="button" disabled={!canRequest} onClick={onGetStarted}>
                Get started
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!canManageBilling || isOpeningBilling}
                loading={isOpeningBilling}
                iconRight={<Launch size={16} />}
                onClick={onOpenBilling}
              >
                View plans
              </Button>
            )}
            {!hasPaymentMethod && (
              <Text size="xs" variant="muted">
                Manage monthly background check credits from{' '}
                <Link href={billingHref} className="font-medium text-primary hover:underline">
                  Billing plans
                </Link>
                .
              </Text>
            )}
          </Stack>
        </div>
      </div>
    </div>
  );
}

export function BackgroundCheckSummary() {
  return (
    <Stack gap="6">
      <Stack gap="2">
        <div className="flex flex-wrap items-center gap-2">
          <Text size="lg" weight="semibold">
            Employee Background Check
          </Text>
        </div>
        <Text variant="muted">
          Streamline employee background checks with Comp AI.
        </Text>
      </Stack>
      <div className="grid gap-3 md:grid-cols-2">
        {BENEFITS.map((benefit) => (
          <div key={benefit} className="flex items-center gap-2 rounded-md border p-3">
            <span className="text-primary">
              <CheckmarkFilled size={16} />
            </span>
            <Text size="sm">{benefit}</Text>
          </div>
        ))}
      </div>
    </Stack>
  );
}

export function BillingCallout({
  title,
  description,
  buttonLabel,
  canManageBilling,
  loading,
  onClick,
}: {
  title: string;
  description: string;
  buttonLabel?: string;
  canManageBilling?: boolean;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-4">
      <HStack justify="between" align="center">
        <Stack gap="xs">
          <Text weight="medium">{title}</Text>
          <Text size="sm" variant="muted">
            {description}
          </Text>
        </Stack>
        {buttonLabel && canManageBilling && onClick && (
          <Button
            type="button"
            variant="outline"
            loading={loading}
            disabled={loading}
            onClick={onClick}
          >
            {buttonLabel}
          </Button>
        )}
      </HStack>
    </div>
  );
}
