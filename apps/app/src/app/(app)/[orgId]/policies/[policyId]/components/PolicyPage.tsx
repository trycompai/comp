import type { Control, Member, Policy, User } from '@db';
import type { AuditLogWithRelations } from '../data';
import { PolicyPageTabs } from './PolicyPageTabs';

export default function PolicyPage({
  policy,
  assignees,
  mappedControls,
  allControls,
  isPendingApproval,
  policyId,
  organizationId,
  logs,
  showAiAssistant,
}: {
  policy: (Policy & { approver: (Member & { user: User }) | null }) | null;
  assignees: (Member & { user: User })[];
  mappedControls: Control[];
  allControls: Control[];
  isPendingApproval: boolean;
  policyId: string;
  organizationId: string;
  logs: AuditLogWithRelations[];
  showAiAssistant: boolean;
}) {
  return (
    <PolicyPageTabs
      policy={policy}
      policyId={policyId}
      organizationId={organizationId}
      assignees={assignees}
      mappedControls={mappedControls}
      allControls={allControls}
      isPendingApproval={isPendingApproval}
      logs={logs}
      showAiAssistant={showAiAssistant}
    />
  );
}
