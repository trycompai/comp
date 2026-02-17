'use client';

import { conciseFormDescriptions } from '@/app/(app)/[orgId]/documents/form-descriptions';
import {
  evidenceFormDefinitions,
  meetingSubTypeValues,
  type EvidenceFormType,
} from '@/app/(app)/[orgId]/documents/forms';
import { api } from '@/lib/api-client';
import { useActiveMember } from '@/utils/auth-client';
import { jwtManager } from '@/utils/jwt-manager';
import {
  Badge,
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
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { DocumentFindingsSection } from './DocumentFindingsSection';
import { StatusBadge, formatSubmissionDate } from './submission-utils';

// ─── Types ───────────────────────────────────────────────────

type EvidenceSubmissionRow = {
  id: string;
  submittedAt: string;
  status: string;
  formType?: string;
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

const MEETING_SUB_TYPES = meetingSubTypeValues;

const MEETING_TYPE_LABELS: Record<string, string> = {
  'board-meeting': 'Board',
  'it-leadership-meeting': 'IT Leadership',
  'risk-committee-meeting': 'Risk Committee',
};

const submissionDateColumnWidth = 128;
const submittedByColumnWidth = 128;
const statusColumnWidth = 176;
const meetingTypeColumnWidth = 140;
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

async function evidenceFormFetcher([endpoint, orgId]: readonly [
  string,
  string,
]): Promise<EvidenceFormResponse> {
  const response = await api.get<EvidenceFormResponse>(endpoint, orgId);
  if (response.error || !response.data) {
    throw new Error(response.error ?? 'Failed to load submissions');
  }
  return response.data;
}

// ─── Main Component ──────────────────────────────────────────

export function CompanyFormPageClient({
  organizationId,
  formType,
  isPlatformAdmin,
}: {
  organizationId: string;
  formType: EvidenceFormType;
  isPlatformAdmin: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const { data: activeMember } = useActiveMember();
  const memberRoles = activeMember?.role?.split(',').map((role: string) => role.trim()) || [];
  const isAuditor = memberRoles.includes('auditor');
  const isAdminOrOwner = memberRoles.includes('admin') || memberRoles.includes('owner');

  const isMeeting = formType === 'meeting';
  const formDefinition = evidenceFormDefinitions[formType];
  const summaryField = formDefinition.fields.find((field) => field.type === 'textarea');
  const matrixSummaryField = formDefinition.fields.find((field) => field.type === 'matrix');
  const hasMatrixSummary = Boolean(matrixSummaryField);
  const showSummaryColumn = Boolean(summaryField) || hasMatrixSummary;

  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';

  const meetingSwrKeys = useMemo(
    () =>
      isMeeting
        ? MEETING_SUB_TYPES.map(
            (subType) => [`/v1/evidence-forms/${subType}${query}`, organizationId] as const,
          )
        : [],
    [isMeeting, query, organizationId],
  );

  const swrKey: readonly [string, string] | null = isMeeting
    ? null
    : [`/v1/evidence-forms/${formType}${query}`, organizationId];

  const { data: singleData, isLoading: singleLoading } = useSWR<EvidenceFormResponse>(
    swrKey,
    evidenceFormFetcher,
  );

  const { data: meetingData0, isLoading: ml0 } = useSWR<EvidenceFormResponse>(
    meetingSwrKeys[0] ?? null,
    evidenceFormFetcher,
  );
  const { data: meetingData1, isLoading: ml1 } = useSWR<EvidenceFormResponse>(
    meetingSwrKeys[1] ?? null,
    evidenceFormFetcher,
  );
  const { data: meetingData2, isLoading: ml2 } = useSWR<EvidenceFormResponse>(
    meetingSwrKeys[2] ?? null,
    evidenceFormFetcher,
  );

  const mergedMeetingSubmissions = useMemo(() => {
    if (!isMeeting) return [];
    const all: EvidenceSubmissionRow[] = [];
    const sources = [
      { data: meetingData0, subType: MEETING_SUB_TYPES[0] },
      { data: meetingData1, subType: MEETING_SUB_TYPES[1] },
      { data: meetingData2, subType: MEETING_SUB_TYPES[2] },
    ];
    for (const { data: d, subType } of sources) {
      if (!d) continue;
      for (const sub of d.submissions) {
        all.push({ ...sub, formType: subType });
      }
    }
    all.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return all;
  }, [isMeeting, meetingData0, meetingData1, meetingData2]);

  const data = isMeeting
    ? mergedMeetingSubmissions.length > 0 || meetingData0 || meetingData1 || meetingData2
      ? {
          form: formDefinition,
          submissions: mergedMeetingSubmissions,
          total: mergedMeetingSubmissions.length,
        }
      : undefined
    : singleData;

  const isLoading = isMeeting ? ml0 || ml1 || ml2 : singleLoading;

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

      const exportTypes = isMeeting ? MEETING_SUB_TYPES : [formType];
      const results: { blob: Blob; exportType: string }[] = [];

      for (const exportType of exportTypes) {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'}/v1/evidence-forms/${exportType}/export.csv`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Organization-Id': organizationId,
            },
            credentials: 'include',
          },
        );

        if (response.status === 400) {
          continue;
        }

        if (!response.ok) {
          throw new Error(await response.text());
        }

        results.push({ blob: await response.blob(), exportType });
      }

      if (results.length === 0) {
        toast.error('No submissions available to export');
        return;
      }

      for (const { blob, exportType } of results) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${exportType}-submissions.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }
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
              <EmptyTitle>No submissions yet</EmptyTitle>
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
              {isMeeting && <col style={{ width: meetingTypeColumnWidth }} />}
              <col style={{ width: submittedByColumnWidth }} />
              {formType === 'access-request' && <col style={{ width: statusColumnWidth }} />}
              {showSummaryColumn && <col style={{ width: summaryColumnWidth }} />}
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="whitespace-nowrap">Submission Date</div>
                </TableHead>
                {isMeeting && (
                  <TableHead>
                    <div className="whitespace-nowrap">Meeting Type</div>
                  </TableHead>
                )}
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

                const submissionFormType = submission.formType ?? formType;

                return (
                  <TableRow
                    key={submission.id}
                    onClick={() =>
                      router.push(
                        `/${organizationId}/documents/${submissionFormType}/submissions/${submission.id}`,
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
                    {isMeeting && (
                      <TableCell>
                        <Badge variant="secondary">
                          {MEETING_TYPE_LABELS[submissionFormType] ?? submissionFormType}
                        </Badge>
                      </TableCell>
                    )}
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

      <DocumentFindingsSection
        formType={formType}
        isAuditor={isAuditor}
        isPlatformAdmin={isPlatformAdmin}
        isAdminOrOwner={isAdminOrOwner}
      />
    </div>
  );
}
