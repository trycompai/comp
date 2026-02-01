import type { Control, Member, Policy, PolicyVersion, User } from '@db';
import type { AuditLogWithRelations } from '../data';
import { PolicyPageTabs } from './PolicyPageTabs';

type PolicyVersionWithPublisher = PolicyVersion & {
  publishedBy: (Member & { user: User }) | null;
};

export default function PolicyPage({
  policy,
  assignees,
  mappedControls,
  allControls,
  isPendingApproval,
  policyId,
  organizationId,
  logs,
  versions,
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
  versions: PolicyVersionWithPublisher[];
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
      versions={versions}
      showAiAssistant={showAiAssistant}
    />
  );
}
