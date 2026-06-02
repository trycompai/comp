'use client';

import { toast } from 'sonner';
import type { IsmsDocument as IsmsDocumentData } from '../isms-types';
import { IsmsDocumentShell } from './IsmsDocumentShell';
import type { ApproverOption } from './IsmsApprovalSection';
import { ObjectivesTable } from './ObjectivesTable';
import type { ObjectiveFormValues } from './ObjectivesForm';
import type { ObjectiveRowUpdate } from './ObjectivesRow';

interface ObjectivesClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
}

const OBJECTIVES_REGISTER = 'objectives' as const;

export function ObjectivesClient(props: ObjectivesClientProps) {
  return (
    <IsmsDocumentShell
      {...props}
      clause="6.2"
      title="Information Security Objectives and Plan"
      description="Define the information security objectives and the plans to achieve them (ISO 27001 clause 6.2). Generate from your platform data, then edit owners, targets, cadence and status as needed."
      sectionTitle="Objectives & plan"
      sectionDescription="Measurable information-security objectives with owners, targets, and review cadence."
      generateSuccessMessage="Generated objectives from platform data"
    >
      {({ document, canManage, hook }) => {
        const handleCreate = async (values: ObjectiveFormValues) => {
          try {
            await hook.createRow({ register: OBJECTIVES_REGISTER, data: { ...values } });
            toast.success('Objective added');
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : 'Failed to add objective');
            // Re-throw so the form keeps the user's input and stays open on failure.
            throw caught;
          }
        };

        const handleUpdate = async ({
          objectiveId,
          update,
        }: {
          objectiveId: string;
          update: ObjectiveRowUpdate;
        }) => {
          try {
            await hook.updateRow({
              register: OBJECTIVES_REGISTER,
              id: objectiveId,
              data: { ...update },
            });
            toast.success('Objective updated');
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : 'Failed to update objective');
            // Re-throw so the row stays in edit mode with the user's changes on failure.
            throw caught;
          }
        };

        const handleDelete = async (objectiveId: string) => {
          try {
            await hook.deleteRow({ register: OBJECTIVES_REGISTER, id: objectiveId });
            toast.success('Objective deleted');
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : 'Failed to delete objective');
          }
        };

        const objectives = Array.isArray(document.objectives) ? document.objectives : [];

        return (
          <ObjectivesTable
            objectives={objectives}
            canEdit={canManage}
            ownerOptions={props.approverOptions}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        );
      }}
    </IsmsDocumentShell>
  );
}
