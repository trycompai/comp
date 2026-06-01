'use client';

import { Heading, Input, Stack, Textarea } from '@trycompai/design-system';
import { useState } from 'react';
import type { IsmsInterestedPartyRequirement } from '../isms-types';
import {
  IsmsCardActions,
  IsmsFieldLabel,
  IsmsRegisterCard,
  IsmsRegisterField,
  IsmsSourceBadge,
} from './shared';

export interface RequirementRowValues {
  partyName: string;
  interestedPartyId: string;
  requirement: string;
  treatment: string;
}

interface RequirementsRowProps {
  requirement: IsmsInterestedPartyRequirement;
  canEdit: boolean;
  onSave: (values: RequirementRowValues) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function RequirementsRow({ requirement, canEdit, onSave, onDelete }: RequirementsRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [partyName, setPartyName] = useState(requirement.partyName);
  const [interestedPartyId, setInterestedPartyId] = useState(requirement.interestedPartyId ?? '');
  const [requirementText, setRequirementText] = useState(requirement.requirement);
  const [treatment, setTreatment] = useState(requirement.treatment);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isDirty =
    partyName !== requirement.partyName ||
    interestedPartyId !== (requirement.interestedPartyId ?? '') ||
    requirementText !== requirement.requirement ||
    treatment !== requirement.treatment;

  const handleCancel = () => {
    setPartyName(requirement.partyName);
    setInterestedPartyId(requirement.interestedPartyId ?? '');
    setRequirementText(requirement.requirement);
    setTreatment(requirement.treatment);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ partyName, interestedPartyId, requirement: requirementText, treatment });
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
      editLabel="Edit requirement"
      deleteLabel="Delete requirement"
    />
  ) : undefined;

  if (isEditing) {
    return (
      <IsmsRegisterCard
        header={<IsmsSourceBadge source={requirement.source} derivedFrom={requirement.derivedFrom} />}
        headerEnd={actions}
      >
        <Stack gap="3">
          <div className="grid gap-3 md:grid-cols-2">
            <IsmsFieldLabel label="Interested party">
              <Input
                value={partyName}
                onChange={(event) => setPartyName(event.target.value)}
                aria-label="Requirement party"
              />
            </IsmsFieldLabel>
            <IsmsFieldLabel label="Linked party ID (optional)">
              <Input
                value={interestedPartyId}
                onChange={(event) => setInterestedPartyId(event.target.value)}
                placeholder="Linked party ID (optional)"
                aria-label="Requirement party ID"
              />
            </IsmsFieldLabel>
          </div>
          <IsmsFieldLabel label="Requirement">
            <Textarea
              value={requirementText}
              onChange={(event) => setRequirementText(event.target.value)}
              rows={3}
              aria-label="Requirement description"
            />
          </IsmsFieldLabel>
          <IsmsFieldLabel label="ISMS treatment">
            <Textarea
              value={treatment}
              onChange={(event) => setTreatment(event.target.value)}
              rows={3}
              aria-label="Requirement treatment"
            />
          </IsmsFieldLabel>
        </Stack>
      </IsmsRegisterCard>
    );
  }

  return (
    <IsmsRegisterCard
      header={
        <Stack gap="2">
          <IsmsSourceBadge source={requirement.source} derivedFrom={requirement.derivedFrom} />
          <Heading level="4">{requirement.requirement}</Heading>
        </Stack>
      }
      headerEnd={actions}
    >
      <Stack gap="3">
        <IsmsRegisterField label="Interested party">{requirement.partyName}</IsmsRegisterField>
        <IsmsRegisterField label="ISMS treatment">{requirement.treatment}</IsmsRegisterField>
      </Stack>
    </IsmsRegisterCard>
  );
}
