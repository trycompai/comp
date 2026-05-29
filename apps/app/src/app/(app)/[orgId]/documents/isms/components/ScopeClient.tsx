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
  IsmsScopeNarrative,
} from '../isms-types';
import { DriftBanner } from './DriftBanner';
import { IsmsApprovalSection, type ApproverOption } from './IsmsApprovalSection';
import { ScopeForm, type ScopeNarrativeValues } from './ScopeForm';

interface ScopeClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
}

const EMPTY_NARRATIVE: IsmsScopeNarrative = {
  certificateScopeSentence: '',
  inScope: '',
  interfaces: [],
  dependencies: [],
  exclusions: [],
  justification: '',
};

function toScopeNarrative(value: unknown): IsmsScopeNarrative {
  if (!value || typeof value !== 'object') return EMPTY_NARRATIVE;
  const record = value as Record<string, unknown>;
  const toStringList = (input: unknown): string[] =>
    Array.isArray(input) ? input.filter((item): item is string => typeof item === 'string') : [];

  return {
    certificateScopeSentence:
      typeof record.certificateScopeSentence === 'string' ? record.certificateScopeSentence : '',
    inScope: typeof record.inScope === 'string' ? record.inScope : '',
    interfaces: toStringList(record.interfaces),
    dependencies: toStringList(record.dependencies),
    exclusions: toStringList(record.exclusions),
    justification: typeof record.justification === 'string' ? record.justification : '',
  };
}

export function ScopeClient({
  organizationId,
  documentId,
  fallbackData,
  currentMemberId,
  approverOptions,
}: ScopeClientProps) {
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
      toast.success('Generated scope from platform data');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveNarrative = async (values: ScopeNarrativeValues) => {
    try {
      await saveNarrative({ ...values });
      toast.success('Scope saved');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to save scope');
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

  const versions = Array.isArray(document?.versions) ? document.versions : [];
  const narrative = toScopeNarrative(versions[0]?.narrative);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="4.3 ISMS Scope"
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
          Define the boundaries and applicability of the information security management system (ISO
          27001 clause 4.3). Generate from your platform data, then refine the certificate scope,
          interfaces, dependencies, and exclusions.
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

      <ScopeForm
        key={`${narrative.certificateScopeSentence}|${versions[0]?.id ?? 'none'}`}
        narrative={narrative}
        canEdit={canManage}
        onSave={handleSaveNarrative}
      />
    </div>
  );
}
