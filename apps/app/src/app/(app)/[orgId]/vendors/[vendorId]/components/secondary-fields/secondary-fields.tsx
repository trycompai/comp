'use client';

import type { Member, User, Vendor } from '@db';
import { UpdateSecondaryFieldsForm } from './update-secondary-fields-form';

export function SecondaryFields({
  vendor,
  assignees,
  onUpdate,
}: {
  vendor: Vendor & { assignee: { user: User | null } | null };
  assignees: (Member & { user: User })[];
  onUpdate?: () => void;
}) {
  return (
    <UpdateSecondaryFieldsForm vendor={vendor} assignees={assignees} onUpdate={onUpdate} />
  );
}
