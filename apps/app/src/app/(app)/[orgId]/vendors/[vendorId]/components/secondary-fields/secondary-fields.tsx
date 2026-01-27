'use client';

import type { Member, User, Vendor } from '@db';
import { Section } from '@trycompai/design-system';
import { UpdateSecondaryFieldsForm } from './update-secondary-fields-form';

export function SecondaryFields({
  vendor,
  assignees,
}: {
  vendor: Vendor & { assignee: { user: User | null } | null };
  assignees: (Member & { user: User })[];
}) {
  return (
    <Section>
      <UpdateSecondaryFieldsForm vendor={vendor} assignees={assignees} />
    </Section>
  );
}
