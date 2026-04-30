'use client';

import {
  Button,
  Grid,
  Input,
  Label,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
import type { UseFormReturn } from 'react-hook-form';
import { BackgroundCheckSummary, BillingCallout } from './BackgroundCheckWizardParts';
import type { BackgroundCheckFormValues } from './backgroundCheckForm';

export function BackgroundCheckDetailsForm({
  canRequest,
  form,
  isOpeningBilling,
  isRequesting,
  billingSetupComplete,
  backgroundChecksRemaining,
  billingHref,
  canGoBack,
  onBack,
  onSubmit,
}: {
  canRequest: boolean;
  form: UseFormReturn<BackgroundCheckFormValues>;
  isOpeningBilling: boolean;
  isRequesting: boolean;
  billingSetupComplete: boolean;
  backgroundChecksRemaining: number | null;
  billingHref: string;
  canGoBack: boolean;
  onBack: () => void;
  onSubmit: (values: BackgroundCheckFormValues) => Promise<void>;
}) {
  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <Stack gap="lg">
        <BackgroundCheckSummary />
        <div className="border-t" />
        {billingSetupComplete && (
          <BillingCallout
            title="Payment method saved"
            description="Complete the employee details to charge the saved payment method and send the invite."
          />
        )}
        <Grid cols={{ base: '1', md: '2' }} gap="4">
          <Stack gap="sm">
            <Label htmlFor="background-check-name">Employee name</Label>
            <Input
              id="background-check-name"
              disabled={!canRequest}
              {...form.register('employeeName')}
            />
            {form.formState.errors.employeeName && (
              <Text size="xs" variant="muted">
                {form.formState.errors.employeeName.message}
              </Text>
            )}
          </Stack>
          <Stack gap="sm">
            <Label htmlFor="background-check-email">Personal email</Label>
            <Input
              id="background-check-email"
              type="email"
              disabled={!canRequest}
              {...form.register('employeeEmail')}
            />
            {form.formState.errors.employeeEmail && (
              <Text size="xs" variant="muted">
                {form.formState.errors.employeeEmail.message}
              </Text>
            )}
          </Stack>
        </Grid>
        <Stack gap="sm">
          <Label htmlFor="background-check-notes">Additional information</Label>
          <Textarea
            id="background-check-notes"
            disabled={!canRequest}
            placeholder="Optional internal notes for your team. These are not sent to the candidate."
            {...form.register('requesterNotes')}
          />
          {form.formState.errors.requesterNotes && (
            <Text size="xs" variant="muted">
              {form.formState.errors.requesterNotes.message}
            </Text>
          )}
        </Stack>
        <div className="flex items-start justify-between gap-4">
          {canGoBack ? (
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
          ) : (
            <div />
          )}
          <div className="flex flex-col items-end gap-1">
            <Button
              type="submit"
              loading={isRequesting || isOpeningBilling}
              disabled={
                !canRequest ||
                isRequesting ||
                isOpeningBilling ||
                backgroundChecksRemaining === 0 ||
                backgroundChecksRemaining === null
              }
            >
              Complete
            </Button>
            {backgroundChecksRemaining !== null && backgroundChecksRemaining > 0 && (
              <Text size="xs" variant="muted">
                {backgroundChecksRemaining} background check
                {backgroundChecksRemaining === 1 ? '' : 's'} remaining this period.
              </Text>
            )}
            {(backgroundChecksRemaining === null || backgroundChecksRemaining === 0) && (
              <Text size="xs" variant="muted">
                No background checks remaining.{' '}
                <a href={billingHref} className="font-medium text-primary hover:underline">
                  Choose a plan
                </a>
                .
              </Text>
            )}
          </div>
        </div>
      </Stack>
    </form>
  );
}
