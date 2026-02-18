'use client';

import type {
  EvidenceFormFieldDefinition,
  EvidenceFormFile,
} from '@/app/(app)/[orgId]/documents/forms';

const submissionDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
});

export function formatSubmissionDate(submissionDate: unknown, submittedAt?: string | null): string {
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

export function renderSubmissionValue(value: unknown, field?: EvidenceFormFieldDefinition) {
  if (!value) return '—';

  if (
    typeof value === 'object' &&
    value !== null &&
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
    const matched = field.options.find((option) => option.value === value);
    if (matched) return matched.label;
  }

  if (field?.type === 'date') {
    return formatSubmissionDate(value);
  }

  if (typeof value === 'string' && value.length > 0) return value;
  return '—';
}

export function StatusBadge({ status }: { status: string }) {
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

export type MatrixRowValue = Record<string, string>;
export type MatrixColumnDefinition = {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
};

export function isMatrixField(
  field: EvidenceFormFieldDefinition,
): field is EvidenceFormFieldDefinition & {
  type: 'matrix';
  columns: ReadonlyArray<MatrixColumnDefinition>;
} {
  return field.type === 'matrix' && Array.isArray(field.columns) && field.columns.length > 0;
}

export function normalizeMatrixRows(value: unknown): MatrixRowValue[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    if (!row || typeof row !== 'object') return {};
    return Object.fromEntries(
      Object.entries(row).map(([key, rawValue]) => [key, typeof rawValue === 'string' ? rawValue : '']),
    );
  });
}
