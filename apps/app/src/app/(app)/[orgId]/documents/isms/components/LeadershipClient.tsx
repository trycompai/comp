'use client';

import { toast } from 'sonner';
import type {
  IsmsDocument as IsmsDocumentData,
  IsmsLeadershipNarrative,
} from '../isms-types';
import { IsmsDocumentShell } from './IsmsDocumentShell';
import type { ApproverOption } from './IsmsApprovalSection';
import { LeadershipForm } from './LeadershipForm';
import type { LeadershipNarrativeValues } from './leadership-schema';

interface LeadershipClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
}

function extractNarrative(
  document: IsmsDocumentData,
): Partial<IsmsLeadershipNarrative> | null {
  const narrative = document.draftNarrative ?? null;
  if (!narrative || typeof narrative !== 'object') return null;
  return narrative as Partial<IsmsLeadershipNarrative>;
}

export function LeadershipClient(props: LeadershipClientProps) {
  return (
    <IsmsDocumentShell
      {...props}
      clause="5.1"
      title="Leadership and Commitment"
      description="Record evidence of top-management leadership and commitment to the ISMS (ISO 27001 clause 5.1). Generate from your platform data, then edit the overall statement and each (a)–(h) commitment as needed."
      sectionTitle="Leadership commitment"
      sectionDescription="The overall leadership statement and each clause 5.1 (a)–(h) commitment."
      generateSuccessMessage="Generated leadership commitment from platform data"
    >
      {({ document, canManage, hook }) => {
        const handleSaveNarrative = async (values: LeadershipNarrativeValues) => {
          try {
            await hook.saveNarrative({
              statement: values.statement,
              commitments: values.commitments,
            });
            toast.success('Document saved');
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : 'Failed to save document');
            // Re-throw so the form keeps the user's input and stays open on failure.
            throw caught;
          }
        };

        return (
          <LeadershipForm
            narrative={extractNarrative(document)}
            canEdit={canManage}
            onSave={handleSaveNarrative}
          />
        );
      }}
    </IsmsDocumentShell>
  );
}
