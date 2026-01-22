'use client';

import type { Member, Policy, User } from '@db';
import { Section } from '@trycompai/design-system';
import { UpdatePolicyOverview } from './UpdatePolicyOverview';

interface PolicySettingsCardProps {
  policy: (Policy & { approver: (Member & { user: User }) | null }) | null;
  assignees: (Member & { user: User })[];
  isPendingApproval: boolean;
  onMutate?: () => void;
}

export function PolicySettingsCard({
  policy,
  assignees,
  isPendingApproval,
  onMutate,
}: PolicySettingsCardProps) {
  if (!policy) {
    return null;
  }

  return (
    <Section title="Policy Settings">
      <UpdatePolicyOverview
        key={`${policy.id}-${policy.status}-${policy.assigneeId ?? 'none'}-${policy.department ?? 'none'}-${policy.frequency ?? 'none'}-${policy.approverId ?? 'none'}`}
        isPendingApproval={isPendingApproval}
        policy={policy}
        assignees={assignees}
        onMutate={onMutate}
      />
    </Section>
  );
}
