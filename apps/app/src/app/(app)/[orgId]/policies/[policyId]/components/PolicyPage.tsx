import { Control, Member, Policy, User } from '@db';
import type { JSONContent } from '@tiptap/react';
import { Comments } from '../../../../../../components/comments/Comments';
import { AuditLogWithRelations } from '../data';
import { PolicyContentManager } from '../editor/components/PolicyDetails';
import { PolicyOverview } from './PolicyOverview';
import { RecentAuditLogs } from './RecentAuditLogs';

export default function PolicyPage({
  policy,
  assignees,
  mappedControls,
  allControls,
  isPendingApproval,
  policyId,
  logs,
}: {
  policy: (Policy & { approver: (Member & { user: User }) | null }) | null;
  assignees: (Member & { user: User })[];
  mappedControls: Control[];
  allControls: Control[];
  isPendingApproval: boolean;
  policyId: string;
  logs: AuditLogWithRelations[];
}) {
  return (
    <>
      <PolicyOverview
        policy={policy ?? null}
        assignees={assignees}
        mappedControls={mappedControls}
        allControls={allControls}
        isPendingApproval={isPendingApproval}
      />
      <PolicyContentManager
        isPendingApproval={isPendingApproval}
        policyId={policyId}
        policyContent={policy?.content ? (policy.content as JSONContent[]) : []}
        displayFormat={policy?.displayFormat}
        pdfUrl={policy?.pdfUrl}
      />

      <RecentAuditLogs logs={logs} />

      <Comments entityId={policyId} entityType="policy" />
    </>
  );
}
