'use client';

import { Badge, Heading, HStack, Input, Stack, Textarea } from '@trycompai/design-system';
import { useEffect, useState } from 'react';
import type { IsmsInterestedParty } from '../isms-types';
import {
  IsmsCardActions,
  IsmsFieldLabel,
  IsmsRegisterCard,
  IsmsRegisterField,
} from './shared';

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

export function InterestedPartiesRow({
  party,
  canEdit,
  onSave,
  onDelete,
}: InterestedPartiesRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(party.name);
  const [category, setCategory] = useState(party.category);
  const [needsExpectations, setNeedsExpectations] = useState(party.needsExpectations);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Re-sync the draft fields from the latest record whenever it changes while
  // the row is not being edited (e.g. after a successful save revalidates), so
  // re-opening edit never shows stale values.
  useEffect(() => {
    if (isEditing) return;
    setName(party.name);
    setCategory(party.category);
    setNeedsExpectations(party.needsExpectations);
  }, [party, isEditing]);

  const isDirty =
    name !== party.name ||
    category !== party.category ||
    needsExpectations !== party.needsExpectations;

  const handleCancel = () => {
    setName(party.name);
    setCategory(party.category);
    setNeedsExpectations(party.needsExpectations);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ name, category, needsExpectations });
      setIsEditing(false);
    } catch {
      // Stay in edit mode with the user's changes when the save fails.
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
      editLabel="Edit interested party"
      deleteLabel="Delete interested party"
    />
  ) : undefined;

  if (isEditing) {
    return (
      <IsmsRegisterCard headerEnd={actions}>
        <Stack gap="3">
          <div className="grid gap-3 md:grid-cols-2">
            <IsmsFieldLabel label="Name">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-label="Interested party name"
              />
            </IsmsFieldLabel>
            <IsmsFieldLabel label="Category">
              <Input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Interested party category"
              />
            </IsmsFieldLabel>
          </div>
          <IsmsFieldLabel label="Needs & expectations">
            <Textarea
              value={needsExpectations}
              onChange={(event) => setNeedsExpectations(event.target.value)}
              rows={3}
              aria-label="Interested party needs and expectations"
            />
          </IsmsFieldLabel>
        </Stack>
      </IsmsRegisterCard>
    );
  }

  return (
    <IsmsRegisterCard
      header={<Heading level="4">{party.name}</Heading>}
      headerEnd={
        <HStack align="center" gap="2">
          {party.category && <Badge variant="secondary">{party.category}</Badge>}
          {actions}
        </HStack>
      }
    >
      <IsmsRegisterField label="Needs & expectations">{party.needsExpectations}</IsmsRegisterField>
    </IsmsRegisterCard>
  );
}
