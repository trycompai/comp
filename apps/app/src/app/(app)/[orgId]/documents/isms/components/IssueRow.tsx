'use client';

import { Stack, Text, Textarea } from '@trycompai/design-system';
import { useState } from 'react';
import type { IsmsContextIssue } from '../isms-types';
import {
  IsmsCardActions,
  IsmsFieldLabel,
  IsmsRegisterCard,
  IsmsRegisterField,
  IsmsSourceBadge,
} from './shared';

interface IssueRowProps {
  issue: IsmsContextIssue;
  canEdit: boolean;
  onSave: (params: { description: string; effect: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function IssueRow({ issue, canEdit, onSave, onDelete }: IssueRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(issue.description);
  const [effect, setEffect] = useState(issue.effect);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isDirty = description !== issue.description || effect !== issue.effect;

  const handleCancel = () => {
    setDescription(issue.description);
    setEffect(issue.effect);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ description, effect });
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

  return (
    <IsmsRegisterCard
      header={<IsmsSourceBadge source={issue.source} derivedFrom={issue.derivedFrom} />}
      headerEnd={
        canEdit ? (
          <IsmsCardActions
            isEditing={isEditing}
            onEdit={() => setIsEditing(true)}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={handleDelete}
            isDirty={isDirty}
            isSaving={isSaving}
            isDeleting={isDeleting}
            editLabel="Edit issue"
            deleteLabel="Delete issue"
          />
        ) : undefined
      }
    >
      {isEditing ? (
        <Stack gap="3">
          <IsmsFieldLabel label="Issue">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              aria-label="Issue description"
            />
          </IsmsFieldLabel>
          <IsmsFieldLabel label="Effect on ISMS">
            <Textarea
              value={effect}
              onChange={(event) => setEffect(event.target.value)}
              rows={3}
              aria-label="Issue effect"
            />
          </IsmsFieldLabel>
        </Stack>
      ) : (
        <Stack gap="3">
          <Text size="sm" weight="medium">
            {issue.description}
          </Text>
          <IsmsRegisterField label="Effect on ISMS">{issue.effect}</IsmsRegisterField>
        </Stack>
      )}
    </IsmsRegisterCard>
  );
}
