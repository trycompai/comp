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
import { InterestedPartiesTable } from './InterestedPartiesTable';
import { IsmsControlMappings } from './IsmsControlMappings';
import { IsmsApprovalSection, type ApproverOption } from './IsmsApprovalSection';
import { IsmsPageHeader } from './shared';

interface InterestedPartiesClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
}

export function InterestedPartiesClient({
  organizationId,
  documentId,
  fallbackData,
  currentMemberId,
  approverOptions,
}: InterestedPartiesClientProps) {
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
      toast.success('Generated interested parties from platform data');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateParty = async (input: {
    name: string;
    category: string;
    needsExpectations: string;
  }) => {
    try {
      await createRow({ register: 'interested-parties', data: { ...input } });
      toast.success('Interested party added');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to add interested party');
    }
  };

  const handleUpdateParty = async (params: {
    partyId: string;
    input: { name: string; category: string; needsExpectations: string };
  }) => {
    try {
      await updateRow({
        register: 'interested-parties',
        id: params.partyId,
        data: { ...params.input },
      });
      toast.success('Interested party updated');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to update interested party');
    }
  };

  const handleDeleteParty = async (partyId: string) => {
    try {
      await deleteRow({ register: 'interested-parties', id: partyId });
      toast.success('Interested party deleted');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to delete interested party');
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

  const parties = Array.isArray(document?.interestedParties) ? document.interestedParties : [];

  return (
    <Stack gap="8">
      <IsmsPageHeader
        clause="4.2"
        title="Interested Parties Register"
        description="Capture the interested parties relevant to the ISMS and their needs and expectations (ISO 27001 clause 4.2a). Generate from your platform data, then edit or add parties as needed."
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

      {drift?.isStale && (
        <DriftBanner
          changedSources={drift.changedSources}
          canRegenerate={canManage}
          isRegenerating={isGenerating}
          onRegenerate={handleGenerate}
        />
      )}

      <Section
        title="Interested parties"
        description="Parties with a stake in the ISMS and their information-security needs and expectations."
      >
        <InterestedPartiesTable
          parties={parties}
          canEdit={canManage}
          onCreate={handleCreateParty}
          onUpdate={handleUpdateParty}
          onDelete={handleDeleteParty}
        />
      </Section>

      {document && (
        <IsmsControlMappings
          document={document}
          organizationId={organizationId}
          canManage={canManage}
        />
      )}
    </Stack>
  );
}
