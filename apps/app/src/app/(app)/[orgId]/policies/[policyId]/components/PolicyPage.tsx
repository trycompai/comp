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
  /** Organization ID - required for correct org context in comments */
  organizationId: string;
  logs: AuditLogWithRelations[];
  /** Whether the AI assistant feature is enabled */
  showAiAssistant: boolean;
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
        aiAssistantEnabled={showAiAssistant}
      />

      <RecentAuditLogs logs={logs} />

      <Comments entityId={policyId} entityType="policy" organizationId={organizationId} />
    </>
  );
}
