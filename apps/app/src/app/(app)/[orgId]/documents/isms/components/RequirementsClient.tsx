'use client';

import { Button, Section, Stack } from '@trycompai/design-system';
import { Document, Download, MachineLearningModel } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { api } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useIsmsDocument } from '../hooks/useIsmsDocument';
import type { IsmsDocument as IsmsDocumentData, IsmsDriftResult } from '../isms-types';
import { DriftBanner } from './DriftBanner';
import { IsmsControlMappings } from './IsmsControlMappings';
import { IsmsApprovalSection, type ApproverOption } from './IsmsApprovalSection';
import { IsmsPageHeader } from './shared';
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

export function RequirementsClient({
  organizationId,
  documentId,
  fallbackData,
  currentMemberId,
  approverOptions,
}: RequirementsClientProps) {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('evidence', 'update');

  const {
    document,
    isExporting,
    generate,
    createRow,
    updateRow,
    deleteRow,
    submitForApproval,
    approve,
    decline,
    handleExport,
  } = useIsmsDocument({ documentId, organizationId, fallbackData });

  const { data: drift, mutate: mutateDrift } = useSWR<IsmsDriftResult>(
    ['/v1/isms/documents', documentId, 'drift'] as const,
    async ([base, id]: readonly [string, string, string]) => {
      const response = await api.get<IsmsDriftResult>(`${base}/${id}/drift`);
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to load drift status');
      }
      return response.data;
    },
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generate();
      await mutateDrift();
      toast.success('Generated requirements from platform data');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreate = async (values: RequirementFormValues) => {
    try {
      await createRow({ register: REGISTER, data: toPayload(values) });
      toast.success('Requirement added');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to add requirement');
    }
  };

  const handleUpdate = async ({ id, values }: { id: string; values: RequirementRowValues }) => {
    try {
      await updateRow({ register: REGISTER, id, data: toPayload(values) });
      toast.success('Requirement updated');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to update requirement');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRow({ register: REGISTER, id });
      toast.success('Requirement deleted');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to delete requirement');
    }
  };

  const handleSubmit = async (approverId: string) => {
    try {
      await submitForApproval(approverId);
      toast.success('Submitted for approval');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to submit');
    }
  };

  const handleApprove = async () => {
    try {
      await approve();
      toast.success('Document approved');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to approve');
    }
  };

  const handleDecline = async () => {
    try {
      await decline();
      toast.success('Document declined');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to decline');
    }
  };

  const requirements = Array.isArray(document?.interestedPartyRequirements)
    ? document.interestedPartyRequirements
    : [];

  return (
    <Stack gap="8">
      <IsmsPageHeader
        clause="4.2"
        title="Interested Parties Requirements & ISMS Treatment"
        description="Capture the requirements of interested parties relevant to information security and how the ISMS addresses each one (ISO 27001 clauses 4.2b and 4.2c). Generate from your platform data, then edit or add requirements as needed."
        status={document?.status ?? null}
        isStale={drift?.isStale}
        backHref={`/${organizationId}/documents`}
        actions={
          <>
            {canManage && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerate}
                disabled={isGenerating}
                loading={isGenerating}
                iconLeft={<MachineLearningModel size={16} />}
              >
                {isGenerating ? 'Generating...' : 'Generate from platform data'}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleExport('pdf')}
              disabled={isExporting}
              iconLeft={<Download size={16} />}
            >
              Export PDF
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleExport('docx')}
              disabled={isExporting}
              iconLeft={<Document size={16} />}
            >
              Export DOCX
            </Button>
          </>
        }
      />

      {drift?.isStale && (
        <DriftBanner
          changedSources={drift.changedSources}
          canRegenerate={canManage}
          isRegenerating={isGenerating}
          onRegenerate={handleGenerate}
        />
      )}

      <Section
        title="Requirements & treatment"
        description="Each interested-party requirement and how the ISMS treats it."
      >
        <RequirementsTable
          requirements={requirements}
          canEdit={canManage}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </Section>

      {document && (
        <IsmsControlMappings
          document={document}
          organizationId={organizationId}
          canManage={canManage}
        />
      )}

      {document && (
        <IsmsApprovalSection
          document={document}
          canManage={canManage}
          currentMemberId={currentMemberId}
          approverOptions={approverOptions}
          onSubmitForApproval={handleSubmit}
          onApprove={handleApprove}
          onDecline={handleDecline}
        />
      )}
    </Stack>
  );
}
