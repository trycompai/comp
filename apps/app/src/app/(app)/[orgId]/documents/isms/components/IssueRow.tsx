'use client';

import { Badge, Button, TableCell, TableRow, Textarea } from '@trycompai/design-system';
import { TrashCan } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type { IsmsContextIssue } from '../isms-types';

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
        <Badge variant={issue.source === 'derived' ? 'secondary' : 'outline'}>
          {issue.source === 'derived' ? 'Auto-derived' : 'Edited'}
        </Badge>
        {issue.derivedFrom && (
          <div className="mt-1">
            <span className="text-[10px] text-muted-foreground">{issue.derivedFrom}</span>
          </div>
        )}
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
          <span className="text-sm">{issue.description}</span>
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
          <span className="text-sm">{issue.effect}</span>
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
              aria-label="Delete issue"
            />
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
