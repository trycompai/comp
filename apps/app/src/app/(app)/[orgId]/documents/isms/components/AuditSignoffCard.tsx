'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  Button,
  Grid,
  Heading,
  HStack,
  Input,
  Stack,
  Text,
} from '@trycompai/design-system';
import { useEffect } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import type { IsmsAudit } from '../isms-types';
import { signoffSchema, type SignoffFormValues } from './audit-schema';
import { IsmsFieldLabel } from './shared';

interface AuditSignoffCardProps {
  audit: IsmsAudit;
  canEdit: boolean;
  onSave: (values: SignoffFormValues) => Promise<void>;
}

const SLOTS: Array<{
  role: string;
  nameField: keyof SignoffFormValues;
  dateField: keyof SignoffFormValues;
}> = [
  {
    role: 'Auditor',
    nameField: 'signoffAuditorName',
    dateField: 'signoffAuditorDate',
  },
  {
    role: 'Information Security Manager / SPO',
    nameField: 'signoffSpoName',
    dateField: 'signoffSpoDate',
  },
  {
    role: 'Top Management',
    nameField: 'signoffTopMgmtName',
    dateField: 'signoffTopMgmtDate',
  },
];

function toFormValues(audit: IsmsAudit): SignoffFormValues {
  return {
    signoffAuditorName: audit.signoffAuditorName ?? '',
    signoffAuditorDate: audit.signoffAuditorDate?.slice(0, 10) ?? '',
    signoffSpoName: audit.signoffSpoName ?? '',
    signoffSpoDate: audit.signoffSpoDate?.slice(0, 10) ?? '',
    signoffTopMgmtName: audit.signoffTopMgmtName ?? '',
    signoffTopMgmtDate: audit.signoffTopMgmtDate?.slice(0, 10) ?? '',
  };
}

function SignoffSlot({
  role,
  nameField,
  dateField,
  control,
  canEdit,
}: {
  role: string;
  nameField: keyof SignoffFormValues;
  dateField: keyof SignoffFormValues;
  control: Control<SignoffFormValues>;
  canEdit: boolean;
}) {
  return (
    <Grid cols={{ base: '1', md: '2' }} gap="3">
      <IsmsFieldLabel label={`${role} — signatory`}>
        <Controller
          control={control}
          name={nameField}
          render={({ field: { ref: _ref, ...field } }) => (
            <Input
              {...field}
              aria-label={`${role} signatory name`}
              placeholder="Name and title"
              disabled={!canEdit}
            />
          )}
        />
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Date signed">
        <Controller
          control={control}
          name={dateField}
          render={({ field: { ref: _ref, ...field } }) => (
            <Input
              {...field}
              type="date"
              aria-label={`${role} sign-off date`}
              disabled={!canEdit}
            />
          )}
        />
      </IsmsFieldLabel>
    </Grid>
  );
}

/**
 * The audit's three sign-off slots (auditor / SPO / top management). Names are
 * free text — external auditors are not platform members. A slot counts as
 * signed once both its name and date are filled; the trio renders as the
 * Sign-off table in the generated clause-9.2 document.
 */
export function AuditSignoffCard({ audit, canEdit, onSave }: AuditSignoffCardProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<SignoffFormValues>({
    resolver: zodResolver(signoffSchema),
    mode: 'onChange',
    defaultValues: toFormValues(audit),
  });

  // Re-sync only when the PERSISTED sign-off values change (own save landing),
  // not on every audit refresh — a sibling register update must not discard
  // unsaved sign-off input.
  const persistedFingerprint = JSON.stringify(toFormValues(audit));
  useEffect(() => {
    reset(JSON.parse(persistedFingerprint) as SignoffFormValues);
  }, [persistedFingerprint, reset]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await onSave(values);
    } catch {
      // Error already surfaced via toast by the caller; keep the edits.
    }
  });

  const values = toFormValues(audit);
  const signedCount = SLOTS.filter(
    (slot) => values[slot.nameField] && values[slot.dateField],
  ).length;

  return (
    <Stack gap="3">
      <HStack align="center" justify="between" gap="3">
        <HStack align="center" gap="2">
          <Heading level="5">Sign-off</Heading>
          <Badge variant="secondary">{`${signedCount} of ${SLOTS.length} signed`}</Badge>
        </HStack>
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleSave}
            disabled={!isDirty || isSubmitting}
            loading={isSubmitting}
          >
            Save sign-off
          </Button>
        ) : null}
      </HStack>
      <Text size="sm" variant="muted">
        Record who signed the completed audit and when. The three slots render as the sign-off
        table in the generated document.
      </Text>
      <Stack gap="4">
        {SLOTS.map((slot) => (
          <SignoffSlot
            key={slot.nameField}
            role={slot.role}
            nameField={slot.nameField}
            dateField={slot.dateField}
            control={control}
            canEdit={canEdit}
          />
        ))}
      </Stack>
    </Stack>
  );
}
