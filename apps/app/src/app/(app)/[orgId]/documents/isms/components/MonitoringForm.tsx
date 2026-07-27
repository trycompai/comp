'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, HStack } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useForm } from 'react-hook-form';
import type { ApproverOption } from './IsmsApprovalSection';
import { MetricFields } from './MetricFields';
import { metricSchema, type MetricFormValues } from './metric-schema';
import { IsmsAddCard } from './shared';

interface MonitoringFormProps {
  memberOptions: ApproverOption[];
  onAdd: (values: MetricFormValues) => Promise<void>;
}

const EMPTY_METRIC: MetricFormValues = {
  name: '',
  whatIsMeasured: '',
  method: '',
  cadence: '',
  monitorMemberId: '',
  analyzeMemberId: '',
  target: '',
};

/** Add-a-custom-metric form, collapsed behind the register's add button. */
export function MonitoringForm({ memberOptions, onAdd }: MonitoringFormProps) {
  return (
    <IsmsAddCard addLabel="Add metric" formTitle="New metric">
      {({ close }) => (
        <MonitoringFormFields memberOptions={memberOptions} onAdd={onAdd} onClose={close} />
      )}
    </IsmsAddCard>
  );
}

function MonitoringFormFields({
  memberOptions,
  onAdd,
  onClose,
}: MonitoringFormProps & { onClose: () => void }) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<MetricFormValues>({
    resolver: zodResolver(metricSchema),
    defaultValues: EMPTY_METRIC,
  });

  const handleAdd = handleSubmit(async (values) => {
    try {
      await onAdd(values);
    } catch {
      // Keep the user's input and the form open when the save fails.
      return;
    }
    reset(EMPTY_METRIC);
    onClose();
  });

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-3">
      <MetricFields control={control} memberOptions={memberOptions} showName />
      <HStack justify="end">
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          loading={isSubmitting}
          disabled={isSubmitting}
          iconLeft={<Add size={16} />}
        >
          Add metric
        </Button>
      </HStack>
    </form>
  );
}
