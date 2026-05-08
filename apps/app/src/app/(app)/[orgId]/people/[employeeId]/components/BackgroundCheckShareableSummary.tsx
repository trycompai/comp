'use client';

import {
  Badge,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import {
  formatLabel,
  formatShareableSummaryText,
  readShareableSummary,
  type SummarySource,
} from './backgroundCheckShareableSummaryData';

export function BackgroundCheckShareableSummary({ snapshot }: { snapshot: unknown }) {
  const summary = readShareableSummary(snapshot);
  if (!summary) return null;

  const findings = summary.linkedKeyFindings.length > 0 ? summary.linkedKeyFindings : null;

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(formatShareableSummaryText(summary));
      toast.success('Summary copied');
    } catch {
      toast.error('Could not copy summary');
    }
  };

  return (
    <div className="rounded-md border bg-background p-6 shadow-sm">
      <Stack gap="xl">
        <Stack gap="lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Shareable summary
              </div>
              {summary.generationStatus !== 'generated' && (
                <Badge variant="secondary">{formatLabel(summary.generationStatus)}</Badge>
              )}
            </div>
            <Button type="button" variant="outline" onClick={handleCopySummary}>
              Copy
            </Button>
          </div>
          <div className="max-w-5xl text-balance text-sm leading-7 text-foreground">
            {summary.overview}
          </div>
        </Stack>

        {findings ? (
          <SummaryList title="Key findings">
            {findings.map((finding, index) => (
              <li key={`${finding.text}-${index}`} className="text-balance leading-7">
                <span>{finding.text}</span>
                {finding.sourceUrl && (
                  <>
                    {' '}
                    <a
                      href={finding.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      {finding.sourceLabel ?? 'Source'}
                    </a>
                  </>
                )}
                {finding.entityType && (
                  <span className="ml-2 inline-flex align-baseline">
                    <Badge variant="secondary">{formatLabel(finding.entityType)}</Badge>
                  </span>
                )}
              </li>
            ))}
          </SummaryList>
        ) : (
          <SummaryList title="Key findings">
            {summary.keyFindings.map((finding, index) => (
              <li key={`${finding}-${index}`} className="text-balance leading-7">
                {finding}
              </li>
            ))}
          </SummaryList>
        )}

        {summary.flags.length > 0 && (
          <SummaryList title="Flags">
            {summary.flags.map((flag, index) => (
              <li key={`${flag}-${index}`} className="text-balance leading-7">
                {flag}
              </li>
            ))}
          </SummaryList>
        )}

        {summary.limitations.length > 0 && (
          <SummaryList title="Limitations">
            {summary.limitations.map((limitation, index) => (
              <li key={`${limitation}-${index}`} className="text-balance leading-7">
                {limitation}
              </li>
            ))}
          </SummaryList>
        )}

        {summary.recommendedNextSteps.length > 0 && (
          <SummaryList title="Recommended next steps">
            {summary.recommendedNextSteps.map((step, index) => (
              <li key={`${step}-${index}`} className="text-balance leading-7">
                {step}
              </li>
            ))}
          </SummaryList>
        )}

        {summary.sources.length > 0 && <SourcesTable sources={summary.sources} />}

        <Text size="xs" variant="muted">
          Generated summary
        </Text>
      </Stack>
    </div>
  );
}

export function hasShareableSummary(snapshot: unknown): boolean {
  return readShareableSummary(snapshot) !== null;
}

function SummaryList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="xs">
      <Text size="xs" variant="muted">
        {title}
      </Text>
      <ul className="ml-4 list-disc space-y-1 text-sm leading-7 text-foreground">{children}</ul>
    </Stack>
  );
}

function SourcesTable({ sources }: { sources: SummarySource[] }) {
  return (
    <Stack gap="sm">
      <Text size="xs" variant="muted">
        Sources
      </Text>
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source) => (
            <TableRow key={`${source.label}-${source.url}`}>
              <TableCell>
                <Stack gap="xs">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-words text-sm text-primary underline underline-offset-2"
                  >
                    {source.label}
                  </a>
                  <Text size="xs" variant="muted">
                    {source.url}
                  </Text>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
