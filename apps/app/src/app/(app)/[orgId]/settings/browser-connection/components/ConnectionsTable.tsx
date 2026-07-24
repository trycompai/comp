'use client';

import { VendorLogo } from '@/components/VendorLogo';
import { Button } from '@trycompai/design-system';
import { Renew, Settings } from '@trycompai/design-system/icons';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { methodOf, statusMeta, summarize, type Connection } from './connection-format';

const PAGE_SIZE = 10;

interface ConnectionsTableProps {
  connections: Connection[];
  canManage: boolean;
  onReconnect: (connection: Connection) => void;
  onManage: (connection: Connection) => void;
}

function StatusPill({ status }: { status: Connection['status'] }) {
  const meta = statusMeta(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: meta.bg, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function lastVerified(connection: Connection): string {
  if (!connection.lastVerifiedAt) return '—';
  try {
    return formatDistanceToNow(new Date(connection.lastVerifiedAt), { addSuffix: true });
  } catch {
    return '—';
  }
}

const HEAD = 'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground';
const CELL = 'px-4 py-3 align-middle';

export function ConnectionsTable({
  connections,
  canManage,
  onReconnect,
  onManage,
}: ConnectionsTableProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter(
      (connection) =>
        connection.hostname.toLowerCase().includes(q) ||
        (connection.displayName ?? '').toLowerCase().includes(q) ||
        (connection.loginIdentity ?? '').toLowerCase().includes(q),
    );
  }, [connections, query]);

  // Back to the first page whenever the search narrows the list.
  useEffect(() => setPage(0), [query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  // Summary reflects what's shown: the filtered set when searching (with an
  // "of N" so the total stays visible), the full set otherwise.
  const isSearching = query.trim().length > 0;
  const totalCount = connections.length;
  const view = summarize(filtered);

  const searchField = (
    <div className="relative w-full">
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="5" />
        <path d="M11 11l3 3" />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search connections…"
        aria-label="Search connections"
        className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-[12px] font-normal normal-case tracking-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Mobile: search above the table — the header-inline search is desktop-only
          so it isn't hidden behind the table's horizontal scroll on small screens. */}
      <div className="sm:hidden">{searchField}</div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className={HEAD}>Vendor</th>
              <th className={HEAD}>Method</th>
              <th className={HEAD}>Connected as</th>
              <th className={HEAD}>Status</th>
              <th className={HEAD}>Automations</th>
              <th className={HEAD}>Last verified</th>
              {/* Desktop: search on the same line as the column headers, right side. */}
              <th className="px-4 py-2 text-right align-middle">
                <div className="ml-auto hidden w-56 sm:block">{searchField}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-[13px] text-muted-foreground"
                >
                  No connections match &ldquo;{query.trim()}&rdquo;.
                </td>
              </tr>
            )}
            {visible.map((connection) => {
            const meta = statusMeta(connection.status);
            const method = methodOf(connection);
            return (
              <tr
                key={connection.id}
                className="border-b border-border last:border-0 hover:bg-muted/40"
              >
                <td className={CELL}>
                  <div className="flex items-center gap-3">
                    <VendorLogo hostname={connection.hostname} size={32} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">
                        {connection.displayName || connection.hostname}
                      </div>
                      <div className="truncate font-mono text-[11.5px] text-muted-foreground">
                        {connection.hostname}
                      </div>
                    </div>
                  </div>
                </td>
                <td className={CELL}>
                  <span className="text-[12.5px] text-foreground">
                    {method === 'password' ? 'Password' : 'SSO'}
                  </span>
                </td>
                <td className={CELL}>
                  <span className="text-[12.5px] text-muted-foreground">
                    {connection.loginIdentity || '—'}
                  </span>
                </td>
                <td className={CELL}>
                  <StatusPill status={connection.status} />
                </td>
                <td className={CELL}>
                  <span
                    className="text-[12.5px]"
                    style={{
                      color:
                        connection.automationCount && connection.automationCount > 0
                          ? 'var(--foreground)'
                          : 'var(--muted-foreground)',
                    }}
                  >
                    {connection.automationCount ?? 0}
                  </span>
                </td>
                <td className={CELL}>
                  <span className="whitespace-nowrap text-[12.5px] text-muted-foreground">
                    {lastVerified(connection)}
                  </span>
                </td>
                <td className={CELL}>
                  <div className="flex items-center justify-end gap-2">
                    {meta.needsAction && canManage && (
                      <Button
                        size="sm"
                        variant={connection.status === 'blocked' ? 'outline' : 'default'}
                        onClick={() => onReconnect(connection)}
                        iconLeft={<Renew size={13} />}
                      >
                        Reconnect
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onManage(connection)}
                      iconLeft={<Settings size={14} />}
                    >
                      Manage
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13px] text-muted-foreground">
          <span className="text-foreground">
            {isSearching
              ? `${view.total} of ${totalCount} connections`
              : `${view.total} ${view.total === 1 ? 'connection' : 'connections'}`}
          </span>
          {' · '}
          <span style={{ color: 'var(--success)' }}>{view.active} active</span>
          {view.needAttention > 0 && (
            <>
              {' · '}
              <span style={{ color: 'oklch(0.5 0.14 85)' }}>
                {view.needAttention} need attention
              </span>
            </>
          )}
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="whitespace-nowrap text-[12px] text-muted-foreground">
              Page {currentPage + 1} of {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
