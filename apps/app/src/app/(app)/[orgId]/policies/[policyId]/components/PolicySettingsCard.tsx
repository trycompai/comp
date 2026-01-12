'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import type { Member, Policy, User } from '@db';
import { UpdatePolicyOverview } from './UpdatePolicyOverview';

interface PolicySettingsCardProps {
  policy: (Policy & { approver: (Member & { user: User }) | null }) | null;
  assignees: (Member & { user: User })[];
  isPendingApproval: boolean;
}

export function PolicySettingsCard({
  policy,
  assignees,
  isPendingApproval,
}: PolicySettingsCardProps) {
  if (!policy) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <UpdatePolicyOverview
          isPendingApproval={isPendingApproval}
          policy={policy}
          assignees={assignees}
        />
      </CardContent>
    </Card>
  );
}
