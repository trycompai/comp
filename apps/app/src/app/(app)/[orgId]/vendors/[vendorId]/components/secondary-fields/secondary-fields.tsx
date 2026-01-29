'use client';

import { Section } from '@trycompai/design-system';
import { UpdateSecondaryFieldsForm } from './update-secondary-fields-form';
import type { AssigneeOption } from '@/components/SelectAssignee';
import type { VendorResponse } from '@/hooks/use-vendors';

export function SecondaryFields({
  vendor,
  assignees,
  onVendorUpdated,
}: {
  vendor: Pick<VendorResponse, 'id' | 'assigneeId' | 'category' | 'status'>;
  assignees: AssigneeOption[];
  onVendorUpdated: () => void;
}) {
  return (
    <Section>
      <UpdateSecondaryFieldsForm
        vendor={vendor}
        assignees={assignees}
        onMutate={onVendorUpdated}
      />
    </Section>
  );
}
