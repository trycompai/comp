'use client';

import { TableCell, TableRow, Text, Textarea } from '@trycompai/design-system';
import { useState } from 'react';
import type { IsmsContextIssue } from '../isms-types';
import { IsmsRowActions, IsmsSourceBadge } from './shared';

interface IssueRowProps {
  issue: IsmsContextIssue;
  canEdit: boolean;
  onSave: (params: { description: string; effect: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function IssueRow({ issue, canEdit, onSave, onDelete }: IssueRowProps) {
  const [description, setDescription] = useState(issue.description);
  const [effect, setEffect] = useState(issue.effect);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isDirty = description !== issue.description || effect !== issue.effect;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ description, effect });
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
        <IsmsSourceBadge source={issue.source} derivedFrom={issue.derivedFrom} />
      </TableCell>
      <TableCell>
        {canEdit ? (
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            aria-label="Issue description"
          />
        ) : (
          <Text size="sm">{issue.description}</Text>
        )}
      </TableCell>
      <TableCell>
        {canEdit ? (
          <Textarea
            value={effect}
            onChange={(event) => setEffect(event.target.value)}
            rows={3}
            aria-label="Issue effect"
          />
        ) : (
          <Text size="sm">{issue.effect}</Text>
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
            deleteLabel="Delete issue"
          />
        </TableCell>
      )}
    </TableRow>
  );
}
