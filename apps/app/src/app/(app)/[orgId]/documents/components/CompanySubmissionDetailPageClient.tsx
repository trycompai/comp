'use client';

import {
  evidenceFormDefinitions,
  type EvidenceFormFieldDefinition,
  type EvidenceFormFile,
  type EvidenceFormType,
} from '@/app/(app)/[orgId]/documents/forms';
import { api } from '@/lib/api-client';
import {
  Button,
  Empty,
  EmptyMedia,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Field,
  FieldLabel,
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { Document } from '@trycompai/design-system/icons';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import useSWR from 'swr';

type EvidenceSubmissionRow = {
  id: string;
  submittedAt: string;
  status: string;
  reviewedAt?: string | null;
  reviewReason?: string | null;
  data: Record<string, unknown>;
  submittedBy?: {
    name: string | null;
    email: string;
  } | null;
  reviewedBy?: {
    name: string | null;
    email: string;
  } | null;
};

type EvidenceSubmissionResponse = {
  form: (typeof evidenceFormDefinitions)[EvidenceFormType];
  submission: EvidenceSubmissionRow;
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
          Approved
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400">
          Pending
        </span>
      );
  }
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

function renderSubmissionValue(value: unknown, field?: EvidenceFormFieldDefinition) {
  if (!value) return '—';

  if (
    typeof value === 'object' &&
    'downloadUrl' in value &&
    typeof value.downloadUrl === 'string'
  ) {
    const fileValue = value as EvidenceFormFile;
    return (
      <a
        href={fileValue.downloadUrl}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline"
      >
        {fileValue.fileName}
      </a>
    );
  }

  if (field?.type === 'select' && field.options && typeof value === 'string') {
    const matched = field.options.find((opt) => opt.value === value);
    if (matched) return matched.label;
  }

  if (field?.type === 'date') {
    return formatSubmissionDate(value);
  }

  return String(value);
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

type MatrixRowValue = Record<string, string>;
type MatrixColumnDefinition = {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
};

function isMatrixField(field: EvidenceFormFieldDefinition): field is EvidenceFormFieldDefinition & {
  type: 'matrix';
  columns: ReadonlyArray<MatrixColumnDefinition>;
} {
  return field.type === 'matrix' && Array.isArray(field.columns) && field.columns.length > 0;
}

function normalizeMatrixRows(value: unknown): MatrixRowValue[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    if (!row || typeof row !== 'object') return {};
    return Object.fromEntries(
      Object.entries(row).map(([key, rawValue]) => [
        key,
        typeof rawValue === 'string' ? rawValue : '',
      ]),
    );
  });
}

export function CompanySubmissionDetailPageClient({
  organizationId,
  formType,
  submissionId,
}: {
  organizationId: string;
  formType: EvidenceFormType;
  submissionId: string;
}) {
  const endpoint = `/v1/evidence-forms/${formType}/submissions/${submissionId}`;
  const swrKey: readonly [string, string] = [endpoint, organizationId];

  const { data, isLoading, error, mutate } = useSWR<EvidenceSubmissionResponse>(
    swrKey,
    async ([path, orgId]: readonly [string, string]) => {
      const response = await api.get<EvidenceSubmissionResponse>(path, orgId);
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to load submission');
      }
      return response.data;
    },
  );

  const [reviewReason, setReviewReason] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleReview = async (action: 'approved' | 'rejected') => {
    if (action === 'rejected' && !reviewReason.trim()) {
      toast.error('A reason is required when rejecting a submission');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const response = await api.patch(
        `/v1/evidence-forms/${formType}/submissions/${submissionId}/review`,
        { action, reason: reviewReason.trim() || undefined },
        organizationId,
      );

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success(action === 'approved' ? 'Submission approved' : 'Submission rejected');
      setReviewReason('');
      mutate();
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <Document size={24} />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>Loading submission...</EmptyTitle>
          <EmptyDescription>Fetching the selected document details.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (error || !data?.submission) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Submission not found</EmptyTitle>
          <EmptyDescription>
            This submission may have been removed or you may not have access.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const submission = data.submission;
  const fields = data.form.fields.filter((field) => field.key !== 'submissionDate');
  const compactFields = fields.filter((f) => f.type === 'text' || f.type === 'date');
  const selectFields = fields.filter((f) => f.type === 'select');
  const textareaFields = fields.filter((f) => f.type === 'textarea');
  const fileFields = fields.filter((f) => f.type === 'file');
  const matrixFields = fields.filter(isMatrixField);

  return (
    <Section>
      <div className="space-y-6">
        <div className="rounded-md border border-border">
          <div className="divide-y divide-border">
            {formType === 'access-request' && (
              <div className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </div>
                <div className="lg:col-span-2 text-sm">
                  <StatusBadge status={submission.status} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Submission Date
              </div>
              <div className="lg:col-span-2 text-sm">
                {formatSubmissionDate(submission.data.submissionDate, submission.submittedAt)}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Submitted By
              </div>
              <div className="lg:col-span-2 text-sm">
                {submission.submittedBy?.name ?? submission.submittedBy?.email ?? 'Unknown'}
              </div>
            </div>
            {formType === 'access-request' && submission.status !== 'pending' && (
              <>
                <div className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Reviewed By
                  </div>
                  <div className="lg:col-span-2 text-sm">
                    {submission.reviewedBy?.name ?? submission.reviewedBy?.email ?? '—'}
                  </div>
                </div>
                {submission.reviewReason && (
                  <div className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Review Reason
                    </div>
                    <div className="lg:col-span-2 text-sm whitespace-pre-wrap">
                      {submission.reviewReason}
                    </div>
                  </div>
                )}
              </>
            )}
            {compactFields.map((field) => (
              <div key={field.key} className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {field.label}
                </div>
                <div className="lg:col-span-2 text-sm">
                  {renderSubmissionValue(submission.data[field.key], field)}
                </div>
              </div>
            ))}
            {selectFields.map((field) => (
              <div key={field.key} className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {field.label}
                </div>
                <div className="lg:col-span-2 text-sm">
                  {renderSubmissionValue(submission.data[field.key], field)}
                </div>
              </div>
            ))}
            {textareaFields.map((field) => {
              const value = submission.data[field.key];
              const content = typeof value === 'string' ? value : '';
              return (
                <div key={field.key} className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {field.label}
                  </div>
                  <div className="lg:col-span-2 text-sm">
                    {content ? (
                      <MarkdownPreview content={content} />
                    ) : (
                      <Text size="sm" variant="muted">
                        —
                      </Text>
                    )}
                  </div>
                </div>
              );
            })}
            {fileFields.map((field) => (
              <div key={field.key} className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {field.label}
                </div>
                <div className="lg:col-span-2 text-sm">
                  {renderSubmissionValue(submission.data[field.key], field)}
                </div>
              </div>
            ))}
            {matrixFields.map((field) => {
              const rows = normalizeMatrixRows(submission.data[field.key]);
              return (
                <div key={field.key} className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {field.label}
                  </div>
                  <div className="lg:col-span-2 text-sm">
                    {rows.length === 0 ? (
                      <Text size="sm" variant="muted">
                        —
                      </Text>
                    ) : (
                      <Table variant="bordered">
                        <TableHeader>
                          <TableRow>
                            {field.columns.map((column) => (
                              <TableHead key={`${field.key}-header-${column.key}`}>
                                {column.label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((row, rowIndex) => (
                            <TableRow key={`${field.key}-row-${rowIndex}`}>
                              {field.columns.map((column) => (
                                <TableCell key={`${field.key}-row-${rowIndex}-${column.key}`}>
                                  <div className="whitespace-pre-wrap">{row[column.key] || '—'}</div>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Review action area — only for access requests */}
        {formType === 'access-request' && submission.status === 'pending' && (
          <div className="rounded-md border border-border">
            <div className="divide-y divide-border">
              <div className="p-4">
                <Text size="sm" weight="medium">
                  Review this submission
                </Text>
              </div>
              <div className="p-4 space-y-4">
                <Field>
                  <FieldLabel htmlFor="reviewReason">Reason (required for rejection)</FieldLabel>
                  <Textarea
                    id="reviewReason"
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    placeholder="Provide a reason for your decision..."
                    rows={4}
                    style={{
                      width: '100%',
                      maxWidth: 'none',
                    }}
                  />
                </Field>
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleReview('rejected')}
                    disabled={isSubmittingReview}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleReview('approved')}
                    disabled={isSubmittingReview}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
