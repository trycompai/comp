'use client';

import {
  Button,
  HStack,
  Stack,
  Text,
} from '@trycompai/design-system';
import { CheckmarkFilled } from '@trycompai/design-system/icons';

const BENEFITS = [
  'Full audited report / background check',
  'Identity verification',
  'Previous employer verification + checks',
  'Reference checks',
  'Social media verifications',
];

export function OverviewStep({
  canRequest,
  onGetStarted,
}: {
  canRequest: boolean;
  onGetStarted: () => void;
}) {
  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <Text size="lg" weight="semibold">
          Streamline background checks now in Comp AI
        </Text>
        <Text variant="muted">
          Send an invite, collect candidate steps, and track verification status from the employee
          profile.
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
      <div className="flex justify-end">
        <Button type="button" disabled={!canRequest} onClick={onGetStarted}>
          Get started
        </Button>
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
