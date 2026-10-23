'use client';

import { Button, HStack, Stack, Textarea } from '@trycompai/design-system';
import { useState } from 'react';

interface ExceptionReasonFormProps {
  onSubmit: (reason: string) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Inline form for marking an offboarding step as an exception: a required
 * free-text reason plus Save / Cancel. Save stays disabled until the reason has
 * non-whitespace content, and submits the trimmed value.
 */
export function ExceptionReasonForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ExceptionReasonFormProps) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <Stack gap="2">
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why is this step being marked as an exception? (e.g. this person was never issued a company device)"
        rows={2}
        disabled={isSubmitting}
        aria-label="Exception reason"
      />
      <HStack gap="2">
        <Button
          size="sm"
          onClick={() => onSubmit(trimmed)}
          disabled={!trimmed || isSubmitting}
          loading={isSubmitting}
        >
          Save exception
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </HStack>
    </Stack>
  );
}
