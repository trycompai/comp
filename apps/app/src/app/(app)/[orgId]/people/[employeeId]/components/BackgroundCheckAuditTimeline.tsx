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

export function BackgroundCheckAuditTimeline({ events }: { events: unknown[] }) {
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
  return timestamp > 0 ? new Date(timestamp).toLocaleString() : null;
}

function eventTimestamp(event: unknown): number {
  const record = toRecord(event);
  if (!record) return 0;
  const value = record.createdAt ?? record.timestamp ?? record.processedAt;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && value.trim() !== '') return numeric;
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
  return 0;
}

function eventKey(event: unknown, index: number): string {
  const record = toRecord(event);
  return readString(record?.id) ?? readString(record?.eventId) ?? `event-${index}`;
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
