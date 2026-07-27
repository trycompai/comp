'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Badge, Grid, Heading, HStack, Stack } from '@trycompai/design-system';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { IsmsObjective, IsmsObjectiveStatus } from '../isms-types';
import { objectiveSchema, type ObjectiveFormValues } from './objective-schema';
import type { ApproverOption } from './IsmsApprovalSection';
import {
  IsmsCardActions,
  IsmsRegisterCard,
  IsmsRegisterField,
  IsmsSourceBadge,
} from './shared';
import { OBJECTIVE_STATUS_LABELS } from './objectives-status';
import { ObjectivesRowEditor } from './ObjectivesRowEditor';

const STATUS_VARIANT: Record<IsmsObjectiveStatus, 'outline' | 'secondary' | 'accent' | 'destructive'> =
  {
    not_started: 'outline',
    on_track: 'secondary',
    at_risk: 'destructive',
    met: 'accent',
  };

/**
 * The values the row emits on save. Shares the canonical objective schema with
 * the add form so add + edit validate against one source of truth.
 */
export type ObjectiveRowUpdate = ObjectiveFormValues;

interface ObjectivesRowProps {
  objective: IsmsObjective;
  canEdit: boolean;
  ownerOptions: ApproverOption[];
  onSave: (update: ObjectiveRowUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
}

function ownerDisplay({
  ownerMemberId,
  ownerOptions,
}: {
  ownerMemberId: string | null;
  ownerOptions: ApproverOption[];
}): string {
  if (!ownerMemberId) return '—';
  return ownerOptions.find((option) => option.id === ownerMemberId)?.name ?? ownerMemberId;
}

function toFormValues(objective: IsmsObjective): ObjectiveFormValues {
  return {
    objective: objective.objective,
    target: objective.target ?? '',
    ownerMemberId: objective.ownerMemberId ?? '',
    cadence: objective.cadence ?? '',
    plan: objective.plan ?? '',
    measurementMethod: objective.measurementMethod ?? '',
    status: objective.status,
  };
}

export function ObjectivesRow({
  objective,
  canEdit,
  ownerOptions,
  onSave,
  onDelete,
}: ObjectivesRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<ObjectiveFormValues>({
    resolver: zodResolver(objectiveSchema),
    mode: 'onChange',
    defaultValues: toFormValues(objective),
  });

  // Re-sync the form from the latest record whenever it changes while the row is
  // not being edited (e.g. after a successful save revalidates, or after
  // generate), so re-opening edit never shows stale values.
  useEffect(() => {
    if (!isEditing) reset(toFormValues(objective));
  }, [objective, isEditing, reset]);

  const handleEdit = () => {
    reset(toFormValues(objective));
    setIsEditing(true);
  };

  const handleCancel = () => {
    reset(toFormValues(objective));
    setIsEditing(false);
  };

  const handleSave = handleSubmit(async (values) => {
    try {
      await onSave(values);
    } catch {
      // Stay in edit mode with the user's changes when the save fails.
      return;
    }
    setIsEditing(false);
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const actions = canEdit ? (
    <IsmsCardActions
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      onDelete={handleDelete}
      isDirty={isDirty && isValid}
      isSaving={isSubmitting}
      isDeleting={isDeleting}
      editLabel="Edit objective"
      deleteLabel="Delete objective"
    />
  ) : undefined;

  if (isEditing) {
    return (
      <IsmsRegisterCard
        header={<IsmsSourceBadge source={objective.source} derivedFrom={objective.derivedFrom} />}
        headerEnd={actions}
      >
        <ObjectivesRowEditor control={control} ownerOptions={ownerOptions} />
      </IsmsRegisterCard>
    );
  }

  return (
    <IsmsRegisterCard
      header={
        <Stack gap="2">
          <IsmsSourceBadge source={objective.source} derivedFrom={objective.derivedFrom} />
          <Heading level="4">{objective.objective}</Heading>
        </Stack>
      }
      headerEnd={
        <HStack align="center" gap="2">
          <Badge variant={STATUS_VARIANT[objective.status]}>
            {OBJECTIVE_STATUS_LABELS[objective.status]}
          </Badge>
          {actions}
        </HStack>
      }
    >
      <Grid cols={{ base: '1', md: '2' }} gap="3">
        <IsmsRegisterField label="Target">{objective.target ?? '—'}</IsmsRegisterField>
        <IsmsRegisterField label="Owner">
          {ownerDisplay({ ownerMemberId: objective.ownerMemberId, ownerOptions })}
        </IsmsRegisterField>
        <IsmsRegisterField label="Cadence">{objective.cadence ?? '—'}</IsmsRegisterField>
        <IsmsRegisterField label="Measurement">
          {objective.measurementMethod ?? '—'}
        </IsmsRegisterField>
        <IsmsRegisterField label="Plan">{objective.plan ?? '—'}</IsmsRegisterField>
      </Grid>
    </IsmsRegisterCard>
  );
}
