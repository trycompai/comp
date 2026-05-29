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
  IsmsDocument as IsmsDocumentData,
  IsmsDriftResult,
  IsmsLeadershipNarrative,
} from '../isms-types';
import { DriftBanner } from './DriftBanner';
import { IsmsApprovalSection, type ApproverOption } from './IsmsApprovalSection';
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
  document: IsmsDocumentData | null,
): Partial<IsmsLeadershipNarrative> | null {
  const versions = Array.isArray(document?.versions) ? document.versions : [];
  const narrative = versions[0]?.narrative ?? null;
  if (!narrative || typeof narrative !== 'object') return null;
  return narrative as Partial<IsmsLeadershipNarrative>;
}

export function LeadershipClient({
  organizationId,
  documentId,
  fallbackData,
  currentMemberId,
  approverOptions,
}: LeadershipClientProps) {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('evidence', 'update');

  const {
    document,
    isExporting,
    generate,
    saveNarrative,
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
      toast.success('Generated leadership commitment from platform data');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveNarrative = async (values: LeadershipNarrativeValues) => {
    try {
      await saveNarrative({ statement: values.statement, commitments: values.commitments });
      toast.success('Document saved');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to save document');
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

  const narrative = extractNarrative(document);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="5.1 Leadership and Commitment"
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
          Record evidence of top-management leadership and commitment to the ISMS (ISO 27001 clause
          5.1). Generate from your platform data, then edit the overall statement and each (a)–(h)
          commitment as needed.
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

      <LeadershipForm narrative={narrative} canEdit={canManage} onSave={handleSaveNarrative} />
    </div>
  );
}
