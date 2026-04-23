import { PageHeader, Text } from '@trycompai/design-system';
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

function SectionHeader() {
  return (
    <>
      <PageHeader title="Statement of Applicability" />
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
  if (soaError) {
    return (
      <div className="flex flex-col gap-8">
        <SectionHeader />
        <div className="flex items-center justify-center rounded-lg border py-12">
          <Text variant="muted">{soaError}</Text>
        </div>
      </div>
    );
  }

  if (soaData) {
    return (
      <div className="flex flex-col gap-8">
        <SectionHeader />
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
      <SectionHeader />
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    </div>
  );
}
