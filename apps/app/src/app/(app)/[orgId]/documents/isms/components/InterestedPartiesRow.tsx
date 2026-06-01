'use client';

import { Input, TableCell, TableRow, Text, Textarea } from '@trycompai/design-system';
import { useState } from 'react';
import type { IsmsInterestedParty } from '../isms-types';
import { IsmsRowActions, IsmsSourceBadge } from './shared';

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
        <IsmsSourceBadge source={party.source} derivedFrom={party.derivedFrom} />
      </TableCell>
      <TableCell>
        {canEdit ? (
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Interested party name"
          />
        ) : (
          <Text size="sm">{party.name}</Text>
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
          <Text size="sm">{party.category}</Text>
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
          <Text size="sm">{party.needsExpectations}</Text>
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
            deleteLabel="Delete interested party"
          />
        </TableCell>
      )}
    </TableRow>
  );
}
