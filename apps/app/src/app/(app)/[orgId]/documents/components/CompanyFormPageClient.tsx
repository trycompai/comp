'use client';

import {
  evidenceFormDefinitions,
  type EvidenceFormType,
} from '@/app/(app)/[orgId]/documents/forms';
import { conciseFormDescriptions } from '@/app/(app)/[orgId]/documents/form-descriptions';
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
import { Add, Catalog, Download, Search } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { StatusBadge, formatSubmissionDate } from './submission-utils';

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

type EvidenceFormResponse = {
  form: (typeof evidenceFormDefinitions)[EvidenceFormType];
  submissions: EvidenceSubmissionRow[];
  total: number;
};

const submissionDateColumnWidth = 128;
const submittedByColumnWidth = 128;
const statusColumnWidth = 176;
const summaryColumnWidth = 280;

// ─── Helpers ─────────────────────────────────────────────────

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return `${str.slice(0, max)}…`;
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
            <Link href={`/${organizationId}/documents/${formType}/new`}>
              <Button iconLeft={<Add size={16} />}>New Submission</Button>
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
          <Empty>
            <EmptyMedia variant="icon">
              <Catalog />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No submissions yet.</EmptyTitle>
              <EmptyDescription>
                Start by creating a new submission, click the New Submission button above.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : !data || data.submissions.length === 0 ? (
          <Empty>
            <EmptyMedia variant="icon">
              <Catalog />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No submissions yet</EmptyTitle>
              <EmptyDescription>
                Start by creating a new submission, click the New Submission button above.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table variant="bordered" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: submissionDateColumnWidth }} />
              <col style={{ width: submittedByColumnWidth }} />
              {formType === 'access-request' && <col style={{ width: statusColumnWidth }} />}
              {showSummaryColumn && <col style={{ width: summaryColumnWidth }} />}
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="whitespace-nowrap">Submission Date</div>
                </TableHead>
                <TableHead>
                  <div className="whitespace-nowrap">Submitted By</div>
                </TableHead>
                {formType === 'access-request' && (
                  <TableHead>
                    <div className="whitespace-nowrap">Status</div>
                  </TableHead>
                )}
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
                        `/${organizationId}/documents/${formType}/submissions/${submission.id}`,
                      )
                    }
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <div className="whitespace-nowrap">
                        {formatSubmissionDate(
                          submission.data.submissionDate,
                          submission.submittedAt,
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="block truncate">
                        {submission.submittedBy?.name ?? submission.submittedBy?.email ?? 'Unknown'}
                      </span>
                    </TableCell>
                    {formType === 'access-request' && (
                      <TableCell>
                        <div>
                          <StatusBadge status={submission.status} />
                        </div>
                      </TableCell>
                    )}
                    {showSummaryColumn && (
                      <TableCell>
                        <span className="block truncate text-muted-foreground">
                          {rowSummary || '—'}
                        </span>
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
