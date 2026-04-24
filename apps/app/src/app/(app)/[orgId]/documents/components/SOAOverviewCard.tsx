import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Text,
} from '@trycompai/design-system';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import { useMemo } from 'react';
import useSWR from 'swr';

const STATEMENT_OF_APPLICABILITY_FORM = {
  type: 'statement-of-applicability',
  title: 'Statement of Applicability',
  description:
    "Auto-complete Statement of Applicability for ISO 27001. Generate answers based on your organization's policies and documentation.",
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

type SOAApprovalStatus =
  | 'Approved'
  | 'Declined'
  | 'Pending'
  | 'Not approved'
  | 'Loading'
  | 'Unavailable';

function SOAApprovalStatusBadge({ status }: { status: SOAApprovalStatus }) {
  const statusConfig: Record<
    SOAApprovalStatus,
    { label: SOAApprovalStatus; className: string }
  > = {
    Loading: {
      label: 'Loading',
      className:
        'bg-slate-100 text-slate-700 dark:bg-slate-950/30 dark:text-slate-300',
    },
    Unavailable: {
      label: 'Unavailable',
      className:
        'bg-slate-100 text-slate-700 dark:bg-slate-950/30 dark:text-slate-300',
    },
    Approved: {
      label: 'Approved',
      className:
        'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400',
    },
    Pending: {
      label: 'Pending',
      className:
        'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400',
    },
    Declined: {
      label: 'Declined',
      className: 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400',
    },
    'Not approved': {
      label: 'Not approved',
      className:
        'bg-slate-100 text-slate-800 dark:bg-slate-950/30 dark:text-slate-400',
    },
  };

  const { label, className } = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider leading-none ${className}`}
    >
      {label}
    </span>
  );
}

export function SOAOverviewCard({
  organizationId,
  iso27001FrameworkId,
}: SOAOverviewCardProps) {
  const form = STATEMENT_OF_APPLICABILITY_FORM;
  const { data: soaSetupResponse, error: soaSetupError, isLoading: isLoadingSOASetup } =
    useSWR<SOASetupResponse>(
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

  const document = soaSetupResponse?.document;
  const approvalStatus = useMemo<SOAApprovalStatus>(() => {
    if (isLoadingSOASetup) return 'Loading';
    if (soaSetupError || !soaSetupResponse?.success) return 'Unavailable';
    if (!document) return 'Not approved';
    if (document.approvedAt) return 'Approved';
    if (document.declinedAt) return 'Declined';
    if (
      document.status === 'needs_review' ||
      document.status === 'pending_approval' ||
      !!document.approverId
    ) {
      return 'Pending';
    }
    return 'Not approved';
  }, [document, isLoadingSOASetup, soaSetupError, soaSetupResponse?.success]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Text size="lg" weight="semibold">
          {form.title}
        </Text>
        <Badge variant="secondary">1</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Link href={`/${organizationId}/documents/${form.type}`}>
          <Card>
            <CardHeader>
              <CardTitle>{form.title}</CardTitle>
              <div className="line-clamp-1">
                <CardDescription>{form.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <SOAApprovalStatusBadge status={approvalStatus} />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
