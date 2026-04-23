'use client';

import { Button, PageHeader, Text } from '@trycompai/design-system';
import { Download } from '@trycompai/design-system/icons';
import { useSOADocument } from '../hooks/useSOADocument';
import { SOAFrameworkTable } from './SOAFrameworkTable';

type SOAFrameworkTableProps = Parameters<typeof SOAFrameworkTable>[0];

export interface SOAData {
  framework: SOAFrameworkTableProps['framework'];
  configuration: SOAFrameworkTableProps['configuration'];
  document: SOAFrameworkTableProps['document'];
  isFullyRemote: boolean;
  canApprove: boolean;
  approver: SOAFrameworkTableProps['approver'];
  isPendingApproval: boolean;
  canCurrentUserApprove: boolean;
  currentMemberId: string | null;
  ownerAdminMembers: SOAFrameworkTableProps['ownerAdminMembers'];
}

interface StatementOfApplicabilitySectionProps {
  organizationId: string;
  soaData?: SOAData | null;
  soaError?: string | null;
}

function SectionHeader({
  onExport,
  isExporting,
  canExport,
}: {
  onExport: () => void;
  isExporting: boolean;
  canExport: boolean;
}) {
  return (
    <>
      <PageHeader
        title="Statement of Applicability"
        actions={
          <Button
            type="button"
            variant="secondary"
            iconLeft={<Download size={16} />}
            onClick={onExport}
            disabled={!canExport || isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        }
      />
      <div className="line-clamp-1">
        <Text variant="muted">
          Auto-complete Statement of Applicability for ISO 27001. Generate answers based on your
          organization's policies and documentation.
        </Text>
      </div>
    </>
  );
}

export function StatementOfApplicabilitySection({
  organizationId,
  soaData,
  soaError,
}: StatementOfApplicabilitySectionProps) {
  const soaDocumentId =
    ((soaData?.document as { id?: string | null } | null | undefined)?.id ??
      null);
  const { handleExport, isExporting } = useSOADocument({
    documentId: soaDocumentId,
    organizationId,
    fallbackData:
      (soaData?.document as Parameters<typeof useSOADocument>[0]['fallbackData']) ??
      null,
  });

  if (soaError) {
    return (
      <div className="flex flex-col gap-8">
        <SectionHeader
          onExport={() => {
            void handleExport('pdf');
          }}
          isExporting={isExporting}
          canExport={false}
        />
        <div className="flex items-center justify-center rounded-lg border py-12">
          <Text variant="muted">{soaError}</Text>
        </div>
      </div>
    );
  }

  if (soaData) {
    return (
      <div className="flex flex-col gap-8">
        <SectionHeader
          onExport={() => {
            void handleExport('pdf');
          }}
          isExporting={isExporting}
          canExport={!!soaDocumentId}
        />
        <SOAFrameworkTable
          framework={soaData.framework}
          configuration={soaData.configuration}
          document={soaData.document}
          organizationId={organizationId}
          isFullyRemote={soaData.isFullyRemote}
          canApprove={soaData.canApprove}
          approver={soaData.approver as Parameters<typeof SOAFrameworkTable>[0]['approver']}
          isPendingApproval={soaData.isPendingApproval}
          canCurrentUserApprove={soaData.canCurrentUserApprove}
          currentMemberId={soaData.currentMemberId}
          ownerAdminMembers={
            soaData.ownerAdminMembers as Parameters<typeof SOAFrameworkTable>[0]['ownerAdminMembers']
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        onExport={() => {
          void handleExport('pdf');
        }}
        isExporting={isExporting}
        canExport={false}
      />
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    </div>
  );
}
