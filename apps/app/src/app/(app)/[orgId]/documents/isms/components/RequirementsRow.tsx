'use client';

import { Badge, Button, Input, TableCell, TableRow, Textarea } from '@trycompai/design-system';
import { TrashCan } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type { IsmsInterestedPartyRequirement } from '../isms-types';

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
        <Badge variant={requirement.source === 'derived' ? 'secondary' : 'outline'}>
          {requirement.source === 'derived' ? 'Auto-derived' : 'Edited'}
        </Badge>
        {requirement.derivedFrom && (
          <div className="mt-1">
            <span className="text-[10px] text-muted-foreground">{requirement.derivedFrom}</span>
          </div>
        )}
      </TableCell>
      <TableCell>
        {canEdit ? (
          <div className="flex flex-col gap-1">
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
          </div>
        ) : (
          <span className="text-sm">{requirement.partyName}</span>
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
          <span className="text-sm">{requirement.requirement}</span>
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
          <span className="text-sm">{requirement.treatment}</span>
        )}
      </TableCell>
      {canEdit && (
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleSave}
              disabled={!isDirty || isSaving || isDeleting}
              loading={isSaving}
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={isSaving || isDeleting}
              loading={isDeleting}
              iconLeft={<TrashCan size={16} />}
              aria-label="Delete requirement"
            />
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
