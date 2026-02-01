'use client';

import type { Member, Policy, PolicyVersion, User } from '@db';
import { Section } from '@trycompai/design-system';
import { UpdatePolicyOverview } from './UpdatePolicyOverview';

type PolicyVersionWithPublisher = PolicyVersion & {
  publishedBy: (Member & { user: User }) | null;
};

interface PolicySettingsCardProps {
  policy: (Policy & { approver: (Member & { user: User }) | null }) | null;
  assignees: (Member & { user: User })[];
  isPendingApproval: boolean;
  versions?: PolicyVersionWithPublisher[];
  onMutate?: () => void;
}

export function PolicySettingsCard({
  policy,
  assignees,
  isPendingApproval,
  versions = [],
  onMutate,
}: PolicySettingsCardProps) {
  if (!policy) {
    return null;
  }

  return (
    <Section title="Policy Settings">
      <UpdatePolicyOverview
        key={policy.id}
        isPendingApproval={isPendingApproval}
        policy={policy}
        assignees={assignees}
        versions={versions}
        onMutate={onMutate}
      />
    </Section>
  );
}
