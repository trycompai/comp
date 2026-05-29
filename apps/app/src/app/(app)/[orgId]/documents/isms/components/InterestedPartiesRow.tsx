'use client';

import { Badge, Button, Input, TableCell, TableRow, Textarea } from '@trycompai/design-system';
import { TrashCan } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type { IsmsInterestedParty } from '../isms-types';

interface InterestedPartiesRowProps {
  party: IsmsInterestedParty;
  canEdit: boolean;
  onSave: (params: {
    name: string;
    category: string;
    needsExpectations: string;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function InterestedPartiesRow({ party, canEdit, onSave, onDelete }: InterestedPartiesRowProps) {
  const [name, setName] = useState(party.name);
  const [category, setCategory] = useState(party.category);
  const [needsExpectations, setNeedsExpectations] = useState(party.needsExpectations);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isDirty =
    name !== party.name ||
    category !== party.category ||
    needsExpectations !== party.needsExpectations;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ name, category, needsExpectations });
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
        <Badge variant={party.source === 'derived' ? 'secondary' : 'outline'}>
          {party.source === 'derived' ? 'Auto-derived' : 'Edited'}
        </Badge>
        {party.derivedFrom && (
          <div className="mt-1">
            <span className="text-[10px] text-muted-foreground">{party.derivedFrom}</span>
          </div>
        )}
      </TableCell>
      <TableCell>
        {canEdit ? (
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Interested party name"
          />
        ) : (
          <span className="text-sm">{party.name}</span>
        )}
      </TableCell>
      <TableCell>
        {canEdit ? (
          <Input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Interested party category"
          />
        ) : (
          <span className="text-sm">{party.category}</span>
        )}
      </TableCell>
      <TableCell>
        {canEdit ? (
          <Textarea
            value={needsExpectations}
            onChange={(event) => setNeedsExpectations(event.target.value)}
            rows={3}
            aria-label="Interested party needs and expectations"
          />
        ) : (
          <span className="text-sm">{party.needsExpectations}</span>
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
              aria-label="Delete interested party"
            />
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
