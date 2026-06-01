'use client';

import { Button, PageHeader, Text } from '@trycompai/design-system';
import { Document, Download, MachineLearningModel } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { api } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useIsmsDocument } from '../hooks/useIsmsDocument';
import type {
  IsmsContextIssueKind,
  IsmsDocument as IsmsDocumentData,
  IsmsDriftResult,
} from '../isms-types';
import { DriftBanner } from './DriftBanner';
import { IsmsControlMappings } from './IsmsControlMappings';
import { IssuesRegister } from './IssuesRegister';
import { IsmsApprovalSection, type ApproverOption } from './IsmsApprovalSection';

interface ContextOfOrganizationClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
}

export function ContextOfOrganizationClient({
  organizationId,
  documentId,
  fallbackData,
  currentMemberId,
  approverOptions,
}: ContextOfOrganizationClientProps) {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('evidence', 'update');

  const {
    document,
    isExporting,
    generate,
    createIssue,
    updateIssue,
    deleteIssue,
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
      toast.success('Generated issues from platform data');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateIssue = async (params: {
    kind: IsmsContextIssueKind;
    description: string;
    effect: string;
  }) => {
    try {
      await createIssue(params);
      toast.success('Issue added');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to add issue');
    }
  };

  const handleUpdateIssue = async (params: {
    issueId: string;
    input: { description: string; effect: string };
  }) => {
    try {
      await updateIssue(params);
      toast.success('Issue updated');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to update issue');
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    try {
      await deleteIssue(issueId);
      toast.success('Issue deleted');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to delete issue');
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

  const issues = Array.isArray(document?.contextIssues) ? document.contextIssues : [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="4.1 Context of the Organization"
        actions={
          <div className="flex items-center gap-2">
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
          </div>
        }
      />
      <div className="line-clamp-2">
        <Text variant="muted">
          Capture the internal and external issues relevant to the ISMS and their effect on its
          objectives (ISO 27001 clause 4.1). Generate from your platform data, then edit or add
          issues as needed.
        </Text>
      </div>

      {drift?.isStale && (
        <DriftBanner
          changedSources={drift.changedSources}
          canRegenerate={canManage}
          isRegenerating={isGenerating}
          onRegenerate={handleGenerate}
        />
      )}

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

      <IssuesRegister
        issues={issues}
        canEdit={canManage}
        onCreate={handleCreateIssue}
        onUpdate={handleUpdateIssue}
        onDelete={handleDeleteIssue}
      />
    </div>
  );
}
