'use client';

import { toast } from 'sonner';
import type { IsmsDocument as IsmsDocumentData } from '../isms-types';
import { IsmsDocumentShell } from './IsmsDocumentShell';
import type { ApproverOption } from './IsmsApprovalSection';
import { RequirementsTable } from './RequirementsTable';
import type { RequirementFormValues } from './RequirementsForm';
import type { RequirementRowValues } from './RequirementsRow';

interface RequirementsClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
}

const REGISTER = 'requirements' as const;

function toPayload(values: RequirementFormValues | RequirementRowValues) {
  return {
    partyName: values.partyName,
    interestedPartyId: values.interestedPartyId?.trim() ? values.interestedPartyId.trim() : null,
    requirement: values.requirement,
    treatment: values.treatment,
  };
}

export function RequirementsClient(props: RequirementsClientProps) {
  return (
    <IsmsDocumentShell
      {...props}
      clause="4.2"
      title="Interested Parties Requirements & ISMS Treatment"
      description="Capture the requirements of interested parties relevant to information security and how the ISMS addresses each one (ISO 27001 clauses 4.2b and 4.2c). Generate from your platform data, then edit or add requirements as needed."
      sectionTitle="Requirements & treatment"
      sectionDescription="Each interested-party requirement and how the ISMS treats it."
      generateSuccessMessage="Generated requirements from platform data"
    >
      {({ document, canManage, hook }) => {
        const handleCreate = async (values: RequirementFormValues) => {
          try {
            await hook.createRow({ register: REGISTER, data: toPayload(values) });
            toast.success('Requirement added');
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : 'Failed to add requirement');
            // Re-throw so the form keeps the user's input and stays open on failure.
            throw caught;
          }
        };

        const handleUpdate = async ({ id, values }: { id: string; values: RequirementRowValues }) => {
          try {
            await hook.updateRow({ register: REGISTER, id, data: toPayload(values) });
            toast.success('Requirement updated');
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : 'Failed to update requirement');
            // Re-throw so the row stays in edit mode with the user's changes on failure.
            throw caught;
          }
        };

        const handleDelete = async (id: string) => {
          try {
            await hook.deleteRow({ register: REGISTER, id });
            toast.success('Requirement deleted');
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : 'Failed to delete requirement');
            // Re-throw so the row's delete state resets only after a real outcome.
            throw caught;
          }
        };

        const requirements = Array.isArray(document.interestedPartyRequirements)
          ? document.interestedPartyRequirements
          : [];

        return (
          <RequirementsTable
            requirements={requirements}
            canEdit={canManage}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        );
      }}
    </IsmsDocumentShell>
  );
}
