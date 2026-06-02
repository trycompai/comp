'use client';

import { toast } from 'sonner';
import type { IsmsDocument as IsmsDocumentData } from '../isms-types';
import { InterestedPartiesTable } from './InterestedPartiesTable';
import { IsmsDocumentShell } from './IsmsDocumentShell';
import type { ApproverOption } from './IsmsApprovalSection';

interface InterestedPartiesClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
}

const REGISTER = 'interested-parties' as const;

export function InterestedPartiesClient(props: InterestedPartiesClientProps) {
  return (
    <IsmsDocumentShell
      {...props}
      clause="4.2"
      title="Interested Parties Register"
      description="Capture the interested parties relevant to the ISMS and their needs and expectations (ISO 27001 clause 4.2a). Generate from your platform data, then edit or add parties as needed."
      sectionTitle="Interested parties"
      sectionDescription="Parties with a stake in the ISMS and their information-security needs and expectations."
      generateSuccessMessage="Generated interested parties from platform data"
    >
      {({ document, canManage, hook }) => {
        const handleCreateParty = async (input: {
          name: string;
          category: string;
          needsExpectations: string;
        }) => {
          try {
            await hook.createRow({ register: REGISTER, data: { ...input } });
            toast.success('Interested party added');
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : 'Failed to add interested party');
            // Re-throw so the form keeps the user's input and stays open on failure.
            throw caught;
          }
        };

        const handleUpdateParty = async (params: {
          partyId: string;
          input: { name: string; category: string; needsExpectations: string };
        }) => {
          try {
            await hook.updateRow({ register: REGISTER, id: params.partyId, data: { ...params.input } });
            toast.success('Interested party updated');
          } catch (caught) {
            toast.error(
              caught instanceof Error ? caught.message : 'Failed to update interested party',
            );
            // Re-throw so the row stays in edit mode with the user's changes on failure.
            throw caught;
          }
        };

        const handleDeleteParty = async (partyId: string) => {
          try {
            await hook.deleteRow({ register: REGISTER, id: partyId });
            toast.success('Interested party deleted');
          } catch (caught) {
            toast.error(
              caught instanceof Error ? caught.message : 'Failed to delete interested party',
            );
          }
        };

        const parties = Array.isArray(document.interestedParties) ? document.interestedParties : [];

        return (
          <InterestedPartiesTable
            parties={parties}
            canEdit={canManage}
            onCreate={handleCreateParty}
            onUpdate={handleUpdateParty}
            onDelete={handleDeleteParty}
          />
        );
      }}
    </IsmsDocumentShell>
  );
}
