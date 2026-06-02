'use client';

import { toast } from 'sonner';
import type { IsmsContextIssueKind, IsmsDocument as IsmsDocumentData } from '../isms-types';
import { IsmsDocumentShell } from './IsmsDocumentShell';
import { IssuesRegister } from './IssuesRegister';
import type { ApproverOption } from './IsmsApprovalSection';

interface ContextOfOrganizationClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
}

export function ContextOfOrganizationClient(props: ContextOfOrganizationClientProps) {
  return (
    <IsmsDocumentShell
      {...props}
      clause="4.1"
      title="Context of the Organization"
      description="Capture the internal and external issues relevant to the ISMS and their effect on its objectives (ISO 27001 clause 4.1). Generate from your platform data, then edit or add issues as needed."
      sectionTitle="Issues register"
      sectionDescription="Internal and external issues that affect the ISMS, grouped by origin."
      generateSuccessMessage="Generated issues from platform data"
    >
      {({ document, canManage, hook }) => {
        const handleCreateIssue = async (params: {
          kind: IsmsContextIssueKind;
          description: string;
          effect: string;
        }) => {
          try {
            await hook.createIssue(params);
            toast.success('Issue added');
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : 'Failed to add issue');
            // Re-throw so the form keeps the user's input and stays open on failure.
            throw caught;
          }
        };

        const handleUpdateIssue = async (params: {
          issueId: string;
          input: { description: string; effect: string };
        }) => {
          try {
            await hook.updateIssue(params);
            toast.success('Issue updated');
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : 'Failed to update issue');
          }
        };

        const handleDeleteIssue = async (issueId: string) => {
          try {
            await hook.deleteIssue(issueId);
            toast.success('Issue deleted');
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : 'Failed to delete issue');
          }
        };

        const issues = Array.isArray(document.contextIssues) ? document.contextIssues : [];

        return (
          <IssuesRegister
            issues={issues}
            canEdit={canManage}
            onCreate={handleCreateIssue}
            onUpdate={handleUpdateIssue}
            onDelete={handleDeleteIssue}
          />
        );
      }}
    </IsmsDocumentShell>
  );
}
