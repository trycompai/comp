import { Control, Member, Policy, User } from '@comp/db/types';
import { JSONContent } from 'novel';
import { Comments, CommentWithAuthor } from '../../../../../../components/comments/Comments';
import { AuditLogWithRelations } from '../data';
import { PolicyPageEditor } from '../editor/components/PolicyDetails';
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
  comments,
}: {
  policy: (Policy & { approver: (Member & { user: User }) | null }) | null;
  assignees: (Member & { user: User })[];
  mappedControls: Control[];
  allControls: Control[];
  isPendingApproval: boolean;
  policyId: string;
  logs: AuditLogWithRelations[];
  comments: CommentWithAuthor[];
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
      <PolicyPageEditor
        isPendingApproval={isPendingApproval}
        policyId={policyId}
        policyContent={policy?.content ? (policy.content as JSONContent[]) : []}
      />

      <RecentAuditLogs logs={logs} />

      <Comments entityId={policyId} comments={comments} entityType="policy" />
    </>
  );
}
