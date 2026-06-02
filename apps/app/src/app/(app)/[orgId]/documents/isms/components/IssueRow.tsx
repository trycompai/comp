'use client';

import { Stack, Text, Textarea } from '@trycompai/design-system';
import { useState } from 'react';
import type { IsmsContextIssue } from '../isms-types';
import {
  IsmsCardActions,
  IsmsFieldLabel,
  IsmsRegisterCard,
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
      editLabel="Edit issue"
      deleteLabel="Delete issue"
    />
  ) : undefined;

  // Edit mode keeps the roomier labelled form.
  if (isEditing) {
    return (
      <IsmsRegisterCard
        header={<IsmsSourceBadge source={issue.source} derivedFrom={issue.derivedFrom} />}
        headerEnd={actions}
      >
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
      </IsmsRegisterCard>
    );
  }

  // Read mode: dense two-line row (issue + effect), source chip + hover actions.
  return (
    <div className="group flex items-start justify-between gap-3 rounded-md border border-border bg-card px-3.5 py-2.5 transition-colors hover:border-foreground/20">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Text size="sm" weight="medium">
          {issue.description}
        </Text>
        <Text size="xs" variant="muted">
          {issue.effect}
        </Text>
        <div className="flex">
          <IsmsSourceBadge source={issue.source} derivedFrom={issue.derivedFrom} />
        </div>
      </div>
      {actions && (
        <div className="shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}
