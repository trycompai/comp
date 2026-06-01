'use client';

import { Badge, Grid, Heading, HStack, Stack } from '@trycompai/design-system';
import { useState } from 'react';
import type { IsmsObjective, IsmsObjectiveStatus } from '../isms-types';
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

export interface ObjectiveRowUpdate {
  objective: string;
  target: string;
  ownerMemberId: string;
  cadence: string;
  plan: string;
  measurementMethod: string;
  status: IsmsObjectiveStatus;
}

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

function toDraft(objective: IsmsObjective): ObjectiveRowUpdate {
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
  const [draft, setDraft] = useState<ObjectiveRowUpdate>(toDraft(objective));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isDirty =
    draft.objective !== objective.objective ||
    draft.target !== (objective.target ?? '') ||
    draft.ownerMemberId !== (objective.ownerMemberId ?? '') ||
    draft.cadence !== (objective.cadence ?? '') ||
    draft.plan !== (objective.plan ?? '') ||
    draft.measurementMethod !== (objective.measurementMethod ?? '') ||
    draft.status !== objective.status;

  const handleCancel = () => {
    setDraft(toDraft(objective));
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

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
      onEdit={() => setIsEditing(true)}
      onSave={handleSave}
      onCancel={handleCancel}
      onDelete={handleDelete}
      isDirty={isDirty}
      isSaving={isSaving}
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
        <ObjectivesRowEditor draft={draft} onChange={setDraft} ownerOptions={ownerOptions} />
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
