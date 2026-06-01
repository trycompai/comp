import { useMemo } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api-client';
import { IsmsDocumentCard } from '../isms/components/shared';
import type { IsmsDocumentStatus } from '../isms/isms-types';

const STATEMENT_OF_APPLICABILITY_FORM = {
  type: 'statement-of-applicability',
  title: 'Statement of Applicability',
  description:
    "Auto-completed for ISO 27001 from your organization's policies and documentation.",
} as const;

interface SOAOverviewCardProps {
  organizationId: string;
  iso27001FrameworkId: string;
}

type SOASetupResponse = {
  success: boolean;
  configuration: Record<string, unknown> | null;
  document: {
    status?: string | null;
    approvedAt?: string | Date | null;
    approverId?: string | null;
    declinedAt?: string | Date | null;
  } | null;
};

/** Map the SOA document state onto the shared ISMS status vocabulary. */
function toIsmsStatus(document: SOASetupResponse['document']): IsmsDocumentStatus | null {
  if (!document) return null;
  if (document.approvedAt) return 'approved';
  if (document.declinedAt) return 'declined';
  if (document.status === 'needs_review' || document.approverId) return 'needs_review';
  return 'draft';
}

export function SOAOverviewCard({ organizationId, iso27001FrameworkId }: SOAOverviewCardProps) {
  const form = STATEMENT_OF_APPLICABILITY_FORM;
  const { data: soaSetupResponse, error: soaSetupError } = useSWR<SOASetupResponse>(
    ['/v1/soa/ensure-setup', organizationId, iso27001FrameworkId],
    async ([endpoint, orgId, frameworkId]: readonly [string, string, string]) => {
      const response = await api.post<SOASetupResponse>(endpoint, {
        organizationId: orgId,
        frameworkId,
      });
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to load SOA status');
      }
      return response.data;
    },
    {
      revalidateOnFocus: true,
    },
  );

  const status = useMemo<IsmsDocumentStatus | null>(() => {
    if (soaSetupError || !soaSetupResponse?.success) return null;
    return toIsmsStatus(soaSetupResponse.document);
  }, [soaSetupError, soaSetupResponse]);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <IsmsDocumentCard
        href={`/${organizationId}/documents/${form.type}`}
        clauseLabel="Annex A"
        title={form.title}
        description={form.description}
        status={status}
      />
    </div>
  );
}
