'use client';

import { Card, CardContent } from '@comp/ui/card';
import type { Member, User, Vendor } from '@db';
import { UpdateSecondaryFieldsForm } from './update-secondary-fields-form';

export function SecondaryFields({
  vendor,
  assignees,
}: {
  vendor: Vendor & { assignee: { user: User | null } | null };
  assignees: (Member & { user: User })[];
}) {
  return (
      <Card>
      <CardContent className="space-y-4 pt-6">
          <UpdateSecondaryFieldsForm vendor={vendor} assignees={assignees} />
        </CardContent>
      </Card>
  );
}
