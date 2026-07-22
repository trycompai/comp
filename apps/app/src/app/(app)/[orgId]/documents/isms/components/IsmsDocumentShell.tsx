'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Section,
  Spinner,
  Stack,
} from '@trycompai/design-system';
import {
  Document,
  Download,
  MachineLearningModel,
  Renew,
  WarningAlt,
} from '@trycompai/design-system/icons';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { useIsmsDocument, type UseIsmsDocumentReturn } from '../hooks/useIsmsDocument';
import { useIsmsDrift } from '../hooks/useIsmsDrift';
import { useIsmsDocumentVersions } from '../hooks/useIsmsDocumentVersions';
import type { IsmsDocument as IsmsDocumentData } from '../isms-types';
import { DriftBanner } from './DriftBanner';
import { IsmsControlMappings } from './IsmsControlMappings';
import { IsmsApprovalSection, type ApproverOption } from './IsmsApprovalSection';
import { IsmsVersionHistory } from './IsmsVersionHistory';
import { IsmsPageHeader } from './shared';

/** Arguments passed to the per-document body render-prop. */
export interface IsmsDocumentBodyArgs {
  document: IsmsDocumentData;
  canManage: boolean;
  /** The full document hook surface, for register-specific create/update/delete wiring. */
  hook: UseIsmsDocumentReturn;
}

export interface IsmsDocumentShellProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
  /** ISO 27001 clause reference, e.g. "4.1". */
  clause: string;
  /** Document title (without the clause prefix). */
  title: string;
  /** Header context blurb. */
  description: string;
  /** Section heading wrapping the register body. */
  sectionTitle: string;
  /** Section description wrapping the register body. */
  sectionDescription: string;
  /** Toast shown after a successful generate, e.g. "Generated issues from platform data". */
  generateSuccessMessage: string;
  /**
   * Optional per-document validation gate. When it returns a non-null reason for
   * the current document, "Submit for approval" is disabled and the reason is
   * shown (used by the Roles document to enforce clause-5.3 completeness). Other
   * documents omit it and are never gated.
   */
  getSubmitBlockedReason?: (document: IsmsDocumentData) => string | null;
  /** Renders the register-specific body once a document is loaded. */
  children: (args: IsmsDocumentBodyArgs) => ReactNode;
}

/**
 * Shared scaffolding for every ISMS foundational-document detail page. Owns the
 * document + drift data, the generate / submit / approve / decline lifecycle,
 * the page header actions, the approval banner, the drift banner and the
 * clause-level control mappings. Each register supplies only its body via the
 * `children` render-prop, keeping the per-document clients tiny.
 */
export function IsmsDocumentShell({
  organizationId,
  documentId,
  fallbackData,
  currentMemberId,
  approverOptions,
  clause,
  title,
  description,
  sectionTitle,
  sectionDescription,
  generateSuccessMessage,
  getSubmitBlockedReason,
  children,
}: IsmsDocumentShellProps) {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('evidence', 'update');

  const hook = useIsmsDocument({ documentId, organizationId, fallbackData });
  const {
    document,
    error,
    isLoading,
    isExporting,
    generate,
    submitForApproval,
    approve,
    decline,
    handleExport,
  } = hook;
  const { isStale, drift, mutateDrift } = useIsmsDrift(documentId);
  const {
    versions,
    isLoading: versionsLoading,
    error: versionsError,
    downloadingVersionId,
    downloadVersion,
    mutateVersions,
  } = useIsmsDocumentVersions(documentId, organizationId);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generate();
      await mutateDrift();
      toast.success(generateSuccessMessage);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
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
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to approve');
      return;
    }
    // Approval already persisted. Refreshing the history list + drift baseline is
    // best-effort — a revalidation hiccup must not look like an approval failure
    // (which would tempt the user to retry an already-published document).
    toast.success('Document approved');
    await Promise.allSettled([mutateVersions(), mutateDrift()]);
  };

  const handleDecline = async () => {
    try {
      await decline();
      toast.success('Document declined');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to decline');
    }
  };

  return (
    <Stack gap="8">
      <IsmsPageHeader
        clause={clause}
        title={title}
        description={description}
        status={document?.status ?? null}
        isStale={isStale}
        backHref={`/${organizationId}/documents?tab=iso-27001`}
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
          submitBlockedReason={getSubmitBlockedReason?.(document) ?? null}
          onSubmitForApproval={handleSubmit}
          onApprove={handleApprove}
          onDecline={handleDecline}
        />
      )}

      {isStale && drift && (
        <DriftBanner
          changedSources={drift.changedSources}
          canRegenerate={canManage}
          isRegenerating={isGenerating}
          onRegenerate={handleGenerate}
        />
      )}

      {!document && error && (
        <Alert variant="destructive" icon={<WarningAlt />}>
          <AlertTitle>Couldn&apos;t load this document</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-3">
              <div>
                {error instanceof Error
                  ? error.message
                  : 'Something went wrong loading this document.'}
              </div>
              <div className="flex">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void hook.refresh()}
                  iconLeft={<Renew size={16} />}
                >
                  Retry
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!document && !error && isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {document && (
        <Section title={sectionTitle} description={sectionDescription}>
          {children({ document, canManage, hook })}
        </Section>
      )}

      {document && (
        <IsmsControlMappings document={document} organizationId={organizationId} canManage={canManage} />
      )}

      {document && (
        <IsmsVersionHistory
          versions={versions}
          isLoading={versionsLoading}
          error={versionsError}
          downloadingVersionId={downloadingVersionId}
          onDownload={downloadVersion}
        />
      )}
    </Stack>
  );
}
