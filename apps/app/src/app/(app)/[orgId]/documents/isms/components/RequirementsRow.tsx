'use client';

import { Input, Stack, TableCell, TableRow, Text, Textarea } from '@trycompai/design-system';
import { useState } from 'react';
import type { IsmsInterestedPartyRequirement } from '../isms-types';
import { IsmsRowActions, IsmsSourceBadge } from './shared';

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ partyName, interestedPartyId, requirement: requirementText, treatment });
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

  return (
    <TableRow>
      <TableCell>
        <IsmsSourceBadge source={requirement.source} derivedFrom={requirement.derivedFrom} />
      </TableCell>
      <TableCell>
        {canEdit ? (
          <Stack gap="1">
            <Input
              value={partyName}
              onChange={(event) => setPartyName(event.target.value)}
              aria-label="Requirement party"
            />
            <Input
              value={interestedPartyId}
              onChange={(event) => setInterestedPartyId(event.target.value)}
              placeholder="Linked party ID (optional)"
              aria-label="Requirement party ID"
            />
          </Stack>
        ) : (
          <Text size="sm">{requirement.partyName}</Text>
        )}
      </TableCell>
      <TableCell>
        {canEdit ? (
          <Textarea
            value={requirementText}
            onChange={(event) => setRequirementText(event.target.value)}
            rows={3}
            aria-label="Requirement description"
          />
        ) : (
          <Text size="sm">{requirement.requirement}</Text>
        )}
      </TableCell>
      <TableCell>
        {canEdit ? (
          <Textarea
            value={treatment}
            onChange={(event) => setTreatment(event.target.value)}
            rows={3}
            aria-label="Requirement treatment"
          />
        ) : (
          <Text size="sm">{requirement.treatment}</Text>
        )}
      </TableCell>
      {canEdit && (
        <TableCell>
          <IsmsRowActions
            onSave={handleSave}
            onDelete={handleDelete}
            isDirty={isDirty}
            isSaving={isSaving}
            isDeleting={isDeleting}
            deleteLabel="Delete requirement"
          />
        </TableCell>
      )}
    </TableRow>
  );
}
