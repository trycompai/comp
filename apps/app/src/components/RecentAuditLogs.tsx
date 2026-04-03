'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@trycompai/ui/avatar';
import type { AuditLog } from '@db';
import {
  Badge,
  Button,
  HStack,
  Section,
  Stack,
  Text,
} from '@trycompai/design-system';
import { ChevronLeft, ChevronRight } from '@trycompai/design-system/icons';
import { formatDistanceToNow } from 'date-fns';
import { ActivityIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';
import type { AuditLogWithRelations } from '@/hooks/use-audit-logs';

const LOGS_PER_PAGE = 15;

const getInitials = (name = '') =>
  name
    ? name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

/** Extract plain text from a value that may be TipTap JSON */
function extractPlainText(str: string): string {
  if (str.startsWith('{') || str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      const extract = (node: Record<string, unknown>): string => {
        if (typeof node.text === 'string') return node.text;
        if (Array.isArray(node.content)) {
          return (node.content as Record<string, unknown>[]).map(extract).join(' ');
        }
        return '';
      };
      const text = extract(parsed).trim();
      if (text) return text;
    } catch { /* not JSON, return as-is */ }
  }
  return str;
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  const str = String(value);
  if (!str || str === 'null' || str === 'undefined') return '—';
  return extractPlainText(str);
};

function parseChanges(log: AuditLog): Record<string, { previous: unknown; current: unknown }> | null {
  try {
    if (typeof log.data === 'object' && log.data !== null) {
      const data = log.data as Record<string, unknown>;
      const changes = data.changes as Record<string, { previous: unknown; current: unknown }> | undefined;
      if (changes && Object.keys(changes).length > 0) return changes;
    }
  } catch { /* ignore */ }
  return null;
}

function LogRow({ log }: { log: AuditLogWithRelations }) {
  const [expanded, setExpanded] = useState(false);
  const userName = log.user?.name || `User ${log.userId.substring(0, 6)}`;
  const timeAgo = formatDistanceToNow(log.timestamp, { addSuffix: true });
  const isCreate = log.description?.toLowerCase().startsWith('created');
  const changes = isCreate ? null : parseChanges(log);
  const changeCount = changes ? Object.keys(changes).length : 0;

  return (
    <Stack gap="sm">
      <HStack
        gap="sm"
        align="center"
        onClick={changeCount > 0 ? () => setExpanded((v) => !v) : undefined}
        role={changeCount > 0 ? 'button' : undefined}
        style={changeCount > 0 ? { cursor: 'pointer' } : undefined}
      >
        <Avatar className="h-5 w-5 shrink-0">
          <AvatarImage src={log.user?.image || ''} alt={userName} />
          <AvatarFallback className="text-[9px]">{getInitials(log.user?.name)}</AvatarFallback>
        </Avatar>

        <Text size="sm" as="span">
          <Text as="span" size="sm" weight="medium">{userName}</Text>
          {log.user?.role === 'admin' && (
            <>
              {' '}<Badge>Comp AI</Badge>
            </>
          )}
          {' '}
          <Text as="span" size="sm" variant="muted">{log.description || 'made a change'}</Text>
          {changeCount > 0 && (
            <Text as="span" size="xs" variant="muted">
              {' '}
              {expanded ? <ChevronDownIcon className="h-3 w-3 inline align-middle" /> : <ChevronRightIcon className="h-3 w-3 inline align-middle" />}
              {' '}{changeCount} change{changeCount > 1 ? 's' : ''}
            </Text>
          )}
        </Text>

        <div className="shrink-0 ml-auto">
          <Text size="xs" variant="muted" font="mono">{timeAgo}</Text>
        </div>
      </HStack>

      {expanded && changes && (
        <div className="pl-7">
          <Stack gap="xs">
            {Object.entries(changes).map(([field, { previous, current }]) => (
              <Text key={field} size="xs" variant="muted">
                <Text as="span" size="xs" weight="medium">{field}</Text>
                {previous != null && String(previous) !== 'null' && (
                  <>
                    {' '}<span className="line-through">{formatValue(previous)}</span>
                  </>
                )}
                {' → '}
                {formatValue(current)}
              </Text>
            ))}
          </Stack>
        </div>
      )}
    </Stack>
  );
}

interface RecentAuditLogsProps {
  logs: AuditLogWithRelations[];
  title?: string;
}

export function RecentAuditLogs({ logs, title = 'Recent Activity' }: RecentAuditLogsProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(logs.length / LOGS_PER_PAGE);
  const paged = logs.slice(page * LOGS_PER_PAGE, (page + 1) * LOGS_PER_PAGE);

  if (logs.length === 0) {
    return (
      <Section title={title}>
        <div className="py-8">
          <Stack gap="sm" align="center">
            <ActivityIcon className="text-muted-foreground/50 h-5 w-5" />
            <Text size="xs" variant="muted">
              Activity will appear here when changes are made
            </Text>
          </Stack>
        </div>
      </Section>
    );
  }

  return (
    <Section title={title}>
      <div className="divide-y [&>*]:py-2.5">
        {paged.map((log) => (
          <LogRow key={log.id} log={log} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="border-t pt-3">
          <HStack justify="between" align="center">
            <Text size="xs" variant="muted">
              {page * LOGS_PER_PAGE + 1}–{Math.min((page + 1) * LOGS_PER_PAGE, logs.length)} of {logs.length}
            </Text>
            <HStack gap="sm" align="center">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                <ChevronLeft size={14} />
              </Button>
              <Text size="xs" variant="muted">
                {page + 1}/{totalPages}
              </Text>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
                <ChevronRight size={14} />
              </Button>
            </HStack>
          </HStack>
        </div>
      )}
    </Section>
  );
}
