'use client';

import { Badge, Stack, Text } from '@trycompai/design-system';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ExternalReportStatus = 'generated' | 'fallback' | 'skipped';

interface ExternalReport {
  format: 'markdown';
  markdown: string;
  generatedAt: number;
  generatedBy: 'ai' | 'system';
  model?: string | null;
  generationStatus: ExternalReportStatus;
  errorMessage?: string | null;
}

const markdownComponents: Components = {
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-words text-primary underline underline-offset-2"
      {...props}
    >
      {children}
    </a>
  ),
  h1: ({ children, ...props }) => (
    <h1 className="text-xl font-semibold leading-tight" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="mt-5 text-lg font-semibold leading-tight first:mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mt-4 text-base font-medium leading-tight first:mt-0" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="leading-7 text-muted-foreground" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="ml-4 list-disc space-y-1 text-muted-foreground" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="ml-4 list-decimal space-y-1 text-muted-foreground" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="pl-1 leading-7" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-medium text-foreground" {...props}>
      {children}
    </strong>
  ),
  code: ({ children, ...props }) => (
    <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-xs" {...props}>
      {children}
    </code>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-2 border-primary/40 pl-4 text-muted-foreground" {...props}>
      {children}
    </blockquote>
  ),
  table: ({ children, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-md border">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th className="border-b bg-muted px-3 py-2 text-left text-xs font-medium uppercase" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border-b px-3 py-2 align-top last:border-b-0" {...props}>
      {children}
    </td>
  ),
};

export function BackgroundCheckExternalReport({ snapshot }: { snapshot: unknown }) {
  const externalReport = readExternalReport(snapshot);
  if (!externalReport) return null;

  const hasMarkdown = externalReport.markdown.trim().length > 0;

  return (
    <div className="rounded-md border bg-muted/10 p-4">
      <Stack gap="md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Stack gap="xs">
            <Text weight="medium">External report</Text>
            <Text size="xs" variant="muted">
              Generated {new Date(externalReport.generatedAt).toLocaleString()} by{' '}
              {formatLabel(externalReport.generatedBy)}
              {externalReport.model ? ` using ${externalReport.model}` : ''}
            </Text>
          </Stack>
          <ReportStatusBadge status={externalReport.generationStatus} />
        </div>

        {hasMarkdown ? (
          <div className="space-y-3 break-words rounded-md bg-background p-4 text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {externalReport.markdown}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-background p-4">
            <Text size="sm" variant="muted">
              {externalReport.errorMessage ?? 'No external report content was generated.'}
            </Text>
          </div>
        )}
      </Stack>
    </div>
  );
}

function ReportStatusBadge({ status }: { status: ExternalReportStatus }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${statusDotClass(status)}`} />
      <Badge variant="secondary">{formatLabel(status)}</Badge>
    </div>
  );
}

function readExternalReport(snapshot: unknown): ExternalReport | null {
  const externalReport = firstRecord(snapshot, [
    ['externalReport'],
    ['report', 'externalReport'],
    ['report', 'report', 'externalReport'],
  ]);
  if (!externalReport) return null;

  if (
    externalReport.format !== 'markdown' ||
    typeof externalReport.markdown !== 'string' ||
    typeof externalReport.generatedAt !== 'number' ||
    !isGeneratedBy(externalReport.generatedBy) ||
    !isGenerationStatus(externalReport.generationStatus)
  ) {
    return null;
  }

  return {
    format: externalReport.format,
    markdown: externalReport.markdown,
    generatedAt: externalReport.generatedAt,
    generatedBy: externalReport.generatedBy,
    generationStatus: externalReport.generationStatus,
    model: readOptionalString(externalReport.model),
    errorMessage: readOptionalString(externalReport.errorMessage),
  };
}

function isGeneratedBy(value: unknown): value is 'ai' | 'system' {
  return value === 'ai' || value === 'system';
}

function isGenerationStatus(value: unknown): value is ExternalReportStatus {
  return value === 'generated' || value === 'fallback' || value === 'skipped';
}

function statusDotClass(status: ExternalReportStatus): string {
  if (status === 'generated') return 'bg-primary';
  if (status === 'fallback') return 'bg-yellow-500';
  return 'bg-muted-foreground';
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstRecord(root: unknown, paths: string[][]): Record<string, unknown> | null {
  for (const path of paths) {
    const record = toRecord(getPath(root, path));
    if (record) return record;
  }
  return null;
}

function getPath(root: unknown, path: string[]): unknown {
  let value = root;
  for (const key of path) {
    const record = toRecord(value);
    if (!record) return undefined;
    value = record[key];
  }
  return value;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
