'use client';

import { Badge, Stack, Text } from '@trycompai/design-system';
import { BackgroundCheckAuditTimeline } from './BackgroundCheckAuditTimeline';
import { BackgroundCheckExternalReport } from './BackgroundCheckExternalReport';
import {
  BackgroundCheckShareableSummary,
  hasShareableSummary,
} from './BackgroundCheckShareableSummary';

const METHODOLOGY_LABELS = [
  'Biometric identity verification',
  'Human-verified employment & references',
  'FCRA-compliant adjudication',
  'AI-augmented public-source research',
];

const REPORT_SECTIONS: Array<{
  title: string;
  method: string;
  paths: string[][];
}> = [
  {
    title: 'Identity & liveness',
    method: 'Government ID + live video, face-matched',
    paths: [['identityVerification'], ['report', 'identity'], ['report', 'report', 'identity']],
  },
  {
    title: 'Employment verification',
    method: 'HR-confirmed by email per employer',
    paths: [['employment'], ['report', 'employment'], ['report', 'report', 'employment']],
  },
  {
    title: 'References',
    method: 'Structured questionnaire per reference',
    paths: [['references'], ['report', 'references'], ['report', 'report', 'references']],
  },
  {
    title: 'Public-source research',
    method: 'LinkedIn + public web, cross-referenced',
    paths: [
      ['linkedinAnalysis'],
      ['latestResearchRun'],
      ['backgroundResearchFindings'],
      ['report', 'socialMedia'],
      ['report', 'report', 'socialMedia'],
    ],
  },
];
const SUMMARY_MAX_LENGTH = 120;
const HIDDEN_STATUS_VALUES = new Set(['not_found', 'not found', 'none', 'unknown']);

export function BackgroundCheckReport({
  snapshot,
  syncedAt,
}: {
  snapshot: unknown;
  syncedAt: string | null;
}) {
  const auditEvents = toArray(getPath(snapshot, ['auditEvents']));

  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Text weight="medium">Verification report</Text>
        {syncedAt && (
          <Text size="xs" variant="muted">
            Snapshot synced {new Date(syncedAt).toLocaleString()}
          </Text>
        )}
      </Stack>
      <MethodologyBanner />
      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_SECTIONS.map((section) => (
          <ReportSection
            key={section.title}
            title={section.title}
            method={section.method}
            value={firstValue(snapshot, section.paths)}
          />
        ))}
      </div>
      {hasShareableSummary(snapshot) ? (
        <BackgroundCheckShareableSummary snapshot={snapshot} />
      ) : (
        <BackgroundCheckExternalReport snapshot={snapshot} />
      )}
      {auditEvents.length > 0 && <BackgroundCheckAuditTimeline events={auditEvents} />}
    </Stack>
  );
}

function MethodologyBanner() {
  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <Stack gap="3">
        <Stack gap="1">
          <Text weight="medium">How this check was performed</Text>
          <Text size="xs" variant="muted">
            Every report combines biometric identity verification with direct employer and
            reference confirmation, plus AI-augmented public-source research — all under an
            FCRA-style adjudication workflow.
          </Text>
        </Stack>
        <div className="flex flex-wrap gap-1.5">
          {METHODOLOGY_LABELS.map((label) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
      </Stack>
    </div>
  );
}

function ReportSection({
  title,
  method,
  value,
}: {
  title: string;
  method: string;
  value: unknown;
}) {
  const status = readStatus(value);
  const description = describeValue(value);

  return (
    <div className="min-w-0 rounded-md border bg-background p-4">
      <Stack gap="sm">
        <Stack gap="1">
          <div className="flex items-center justify-between gap-3">
            <Text weight="medium">{title}</Text>
            {status && shouldShowStatus(status) && (
              <Badge variant="secondary">{formatLabel(status)}</Badge>
            )}
          </div>
          <Text size="xs" variant="muted">
            {method}
          </Text>
        </Stack>
        <div className="min-w-0 overflow-hidden break-words text-sm text-muted-foreground">
          {description}
        </div>
      </Stack>
    </div>
  );
}

function firstValue(root: unknown, paths: string[][]): unknown {
  for (const path of paths) {
    const value = getPath(root, path);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
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

function describeValue(value: unknown): string {
  const values = toArray(value);
  if (values.length > 0) {
    return `${values.length} verified entr${values.length === 1 ? 'y' : 'ies'} on file`;
  }

  const record = toRecord(value);
  if (!record) return 'Awaiting candidate submission for this section.';

  for (const key of ['summary', 'notes', 'message', 'decision', 'result', 'outcome']) {
    const text = readString(record[key]);
    if (text) return truncateSummary(text);
  }

  return `${Object.keys(record).length} verification fields recorded`;
}

function truncateSummary(value: string): string {
  if (value.length <= SUMMARY_MAX_LENGTH) return value;
  return `${value.slice(0, SUMMARY_MAX_LENGTH).trimEnd()}...`;
}

function readStatus(value: unknown): string | null {
  const record = toRecord(value);
  if (!record) return null;

  for (const key of ['status', 'overallStatus', 'verificationStatus', 'result', 'outcome']) {
    const status = readString(record[key]);
    if (status) return status;
  }

  return null;
}

function shouldShowStatus(status: string): boolean {
  return !HIDDEN_STATUS_VALUES.has(status.trim().toLowerCase());
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
