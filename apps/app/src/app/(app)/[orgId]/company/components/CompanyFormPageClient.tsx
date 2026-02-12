'use client';

import { evidenceFormDefinitions, type EvidenceFormType } from '@/app/(app)/[orgId]/company/forms';
import { api } from '@/lib/api-client';
import { jwtManager } from '@/utils/jwt-manager';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Document, Download, Search } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

const conciseFormDescriptions: Record<string, string> = {
  'board-meeting': 'Hold a board meeting and capture minutes.',
  'it-leadership-meeting': 'Run an IT leadership meeting and document outcomes.',
  'risk-committee-meeting': 'Conduct a risk committee meeting and record decisions.',
  'access-request': 'Track and retain user access requests. Employees can request access to systems through the employee portal.',
  'whistleblower-report': 'Submit a confidential whistleblower report.',
  'penetration-test': 'Upload a third-party penetration test report.',
  'rbac-matrix': 'Document role-based access by system, role, and approval.',
  'infrastructure-inventory': 'Track infrastructure assets, ownership, and review dates.',
  'employee-performance-evaluation': 'Capture structured employee review outcomes and sign-off.',
};

// ─── Types ───────────────────────────────────────────────────

type EvidenceSubmissionRow = {
  id: string;
  submittedAt: string;
  status: string;
  data: Record<string, unknown>;
  submittedBy?: {
    name: string | null;
    email: string;
  } | null;
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
          Approved
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400">
          Pending
        </span>
      );
  }
}

type EvidenceFormResponse = {
  form: (typeof evidenceFormDefinitions)[EvidenceFormType];
  submissions: EvidenceSubmissionRow[];
  total: number;
};

// ─── Helpers ─────────────────────────────────────────────────

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return `${str.slice(0, max)}…`;
}

const submissionDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
});

function formatSubmissionDate(submissionDate: unknown, submittedAt?: string | null): string {
  const candidates: unknown[] = [submissionDate, submittedAt];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const value = candidate.trim();
    if (!value) continue;

    // Preserve the date exactly for YYYY-MM-DD and ISO date-time inputs.
    const ymdMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (ymdMatch) {
      return `${ymdMatch[2]}/${ymdMatch[3]}/${ymdMatch[1]}`;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return submissionDateFormatter.format(parsed);
    }
  }

  return '—';
}

function getMatrixRowCount(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter((row) => row && typeof row === 'object').length;
}

// ─── Main Component ──────────────────────────────────────────

export function CompanyFormPageClient({
  organizationId,
  formType,
}: {
  organizationId: string;
  formType: EvidenceFormType;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const formDefinition = evidenceFormDefinitions[formType];
  const summaryField = formDefinition.fields.find((field) => field.type === 'textarea');
  const matrixSummaryField = formDefinition.fields.find((field) => field.type === 'matrix');
  const hasMatrixSummary = Boolean(matrixSummaryField);
  const showSummaryColumn = Boolean(summaryField) || hasMatrixSummary;

  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  const swrKey: readonly [string, string] = [
    `/v1/evidence-forms/${formType}${query}`,
    organizationId,
  ];

  const { data, isLoading } = useSWR<EvidenceFormResponse>(
    swrKey,
    async ([endpoint, orgId]: readonly [string, string]) => {
      const response = await api.get<EvidenceFormResponse>(endpoint, orgId);
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to load evidence form submissions');
      }
      return response.data;
    },
  );

  const handleExportCsv = async () => {
    if (!data || data.total === 0) {
      toast.error('No submissions available to export');
      return;
    }

    setIsExporting(true);
    try {
      const token = await jwtManager.getValidToken();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'}/v1/evidence-forms/${formType}/export.csv`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Organization-Id': organizationId,
          },
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${formType}-submissions.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'CSV export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={formDefinition.title}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/${organizationId}/company/${formType}/new`}>
              <Button>New Submission</Button>
            </Link>
            <Button
              type="button"
              variant="secondary"
              iconLeft={<Download size={16} />}
              onClick={handleExportCsv}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        }
      />
      <div className="line-clamp-1">
        <Text variant="muted">
          {conciseFormDescriptions[formType] ?? formDefinition.description}
        </Text>
      </div>

      {/* ─── Submissions List ─── */}
      <div className="space-y-3">
        <div className="w-full md:max-w-[300px]">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search submissions..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
        </div>

        {isLoading ? (
          <Text variant="muted">Loading submissions...</Text>
        ) : !data || data.submissions.length === 0 ? (
          <Empty>
            <EmptyMedia variant="icon">
              <Document size={24} />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No submissions yet</EmptyTitle>
              <EmptyDescription>
                Click New Submission to create your first {formDefinition.title.toLowerCase()}{' '}
                record.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table variant="bordered">
            <TableHeader>
              <TableRow>
                <TableHead>Submission Date</TableHead>
                <TableHead>Submitted By</TableHead>
                {formType === 'access-request' && <TableHead>Status</TableHead>}
                {showSummaryColumn && <TableHead>Summary</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.submissions.map((submission) => {
                const summaryValue = summaryField
                  ? String(submission.data[summaryField.key] ?? '')
                  : '';
                const matrixSummary = matrixSummaryField
                  ? `${getMatrixRowCount(submission.data[matrixSummaryField.key])} row(s)`
                  : '';
                const rowSummary = summaryField ? truncate(summaryValue, 80) : matrixSummary;

                return (
                  <TableRow
                    key={submission.id}
                    onClick={() =>
                      router.push(
                        `/${organizationId}/company/${formType}/submissions/${submission.id}`,
                      )
                    }
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      {formatSubmissionDate(submission.data.submissionDate, submission.submittedAt)}
                    </TableCell>
                    <TableCell>
                      {submission.submittedBy?.name ?? submission.submittedBy?.email ?? 'Unknown'}
                    </TableCell>
                    {formType === 'access-request' && (
                      <TableCell>
                        <StatusBadge status={submission.status} />
                      </TableCell>
                    )}
                    {showSummaryColumn && (
                      <TableCell>
                        <span className="text-muted-foreground">{rowSummary || '—'}</span>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
