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

export function ObjectivesClient({
  organizationId,
  documentId,
  fallbackData,
  currentMemberId,
  approverOptions,
}: ObjectivesClientProps) {
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
      toast.success('Generated objectives from platform data');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreate = async (values: ObjectiveFormValues) => {
    try {
      await createRow({ register: OBJECTIVES_REGISTER, data: { ...values } });
      toast.success('Objective added');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to add objective');
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
      await updateRow({ register: OBJECTIVES_REGISTER, id: objectiveId, data: { ...update } });
      toast.success('Objective updated');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to update objective');
    }
  };

  const handleDelete = async (objectiveId: string) => {
    try {
      await deleteRow({ register: OBJECTIVES_REGISTER, id: objectiveId });
      toast.success('Objective deleted');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to delete objective');
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

  const objectives = Array.isArray(document?.objectives) ? document.objectives : [];

  return (
    <Stack gap="8">
      <IsmsPageHeader
        clause="6.2"
        title="Information Security Objectives and Plan"
        description="Define the information security objectives and the plans to achieve them (ISO 27001 clause 6.2). Generate from your platform data, then edit owners, targets, cadence and status as needed."
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
        title="Objectives & plan"
        description="Measurable information-security objectives with owners, targets, and review cadence."
      >
        <ObjectivesTable
          objectives={objectives}
          canEdit={canManage}
          ownerOptions={approverOptions}
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
