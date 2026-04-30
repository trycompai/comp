'use client';

import {
  Badge,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { BackgroundCheckExternalReport } from './BackgroundCheckExternalReport';
import {
  BackgroundCheckShareableSummary,
  hasShareableSummary,
} from './BackgroundCheckShareableSummary';

const REPORT_SECTIONS = [
  {
    title: 'Identity verification',
    paths: [['identityVerification'], ['report', 'identity'], ['report', 'report', 'identity']],
  },
  {
    title: 'Employment verification',
    paths: [['employment'], ['report', 'employment'], ['report', 'report', 'employment']],
  },
  {
    title: 'References',
    paths: [['references'], ['report', 'references'], ['report', 'report', 'references']],
  },
  {
    title: 'Social and media research',
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
        <Text weight="medium">Report</Text>
        {syncedAt && (
          <Text size="xs" variant="muted">
            Snapshot synced {new Date(syncedAt).toLocaleString()}
          </Text>
        )}
      </Stack>
      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_SECTIONS.map((section) => (
          <ReportSection
            key={section.title}
            title={section.title}
            value={firstValue(snapshot, section.paths)}
          />
        ))}
      </div>
      {hasShareableSummary(snapshot) ? (
        <BackgroundCheckShareableSummary snapshot={snapshot} />
      ) : (
        <BackgroundCheckExternalReport snapshot={snapshot} />
      )}
      {auditEvents.length > 0 && <AuditTimeline events={auditEvents} />}
    </Stack>
  );
}

function ReportSection({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  const status = readStatus(value);
  const description = describeValue(value);

  return (
    <div className="min-w-0 rounded-md border bg-background p-4">
      <Stack gap="sm">
        <div className="flex items-center justify-between gap-3">
          <Text weight="medium">{title}</Text>
          {status && shouldShowStatus(status) && (
            <Badge variant="secondary">{formatLabel(status)}</Badge>
          )}
        </div>
        <div className="min-w-0 overflow-hidden break-words text-sm text-muted-foreground">
          {description}
        </div>
      </Stack>
    </div>
  );
}

function AuditTimeline({ events }: { events: unknown[] }) {
  const sortedEvents = [...events].sort((a, b) => eventTimestamp(b) - eventTimestamp(a));

  return (
    <Stack gap="sm">
      <Text weight="medium">Audit timeline</Text>
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEvents.slice(0, 5).map((event, index) => (
            <TableRow key={eventKey(event, index)}>
              <TableCell>
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant="secondary">{eventCategory(event)}</Badge>
                  <Text size="sm">{eventLabel(event)}</Text>
                </div>
              </TableCell>
              <TableCell>
                <Text size="sm" variant="muted">
                  {eventTime(event) ?? '-'}
                </Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
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
    return `${values.length} item${values.length === 1 ? '' : 's'} recorded`;
  }

  const record = toRecord(value);
  if (!record) return 'Not included in the synced report snapshot';

  for (const key of ['summary', 'notes', 'message', 'decision', 'result', 'outcome']) {
    const text = readString(record[key]);
    if (text) return truncateSummary(text);
  }

  return `${Object.keys(record).length} report fields captured`;
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

function eventLabel(event: unknown): string {
  const record = toRecord(event);
  if (!record) return 'Report event';
  const label =
    readString(record.eventType) ??
    readString(record.type) ??
    readString(record.message) ??
    'Report event';

  return formatEventLabel(label);
}

function eventCategory(event: unknown): string {
  const record = toRecord(event);
  if (!record) return 'Report';
  const label = readString(record.eventType) ?? readString(record.type) ?? '';
  return formatLabel(label.split('.')[0] || 'report');
}

function eventTime(event: unknown): string | null {
  const timestamp = eventTimestamp(event);
  if (timestamp > 0) {
    return new Date(timestamp).toLocaleString();
  }
  return null;
}

function eventTimestamp(event: unknown): number {
  const record = toRecord(event);
  if (!record) return 0;
  const value = record.createdAt ?? record.timestamp ?? record.processedAt;
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && value.trim() !== '') {
      return numeric;
    }
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
  return 0;
}

function eventKey(event: unknown, index: number): string {
  const record = toRecord(event);
  return readString(record?.id) ?? readString(record?.eventId) ?? `event-${index}`;
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

function formatEventLabel(value: string): string {
  return formatLabel(value.split('.').slice(1).join('.') || value).replace(/\./g, ' ');
}
