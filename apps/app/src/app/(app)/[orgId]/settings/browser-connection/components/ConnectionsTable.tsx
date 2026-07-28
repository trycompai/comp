'use client';

import { VendorLogo } from '@/components/VendorLogo';
import { Button } from '@trycompai/design-system';
import { Renew, Settings } from '@trycompai/design-system/icons';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import {
  methodOf,
  permanenceHint,
  permanenceMeta,
  permanenceStateOf,
  type Connection,
} from './connection-format';

const PAGE_SIZE = 10;

interface ConnectionsTableProps {
  connections: Connection[];
  canManage: boolean;
  /** Live automatic-2FA status per connection id (drives permanent vs at-risk). */
  totpStatuses: Record<string, boolean>;
  /** True until the first status response — password rows show "Checking…". */
  statusesLoading: boolean;
  onReconnect: (connection: Connection) => void;
  onManage: (connection: Connection) => void;
  onMakePermanent: (connection: Connection) => void;
}

function lastVerified(connection: Connection): string {
  if (!connection.lastVerifiedAt) return 'Not verified yet';
  try {
    return `Last verified ${formatDistanceToNow(new Date(connection.lastVerifiedAt), {
      addSuffix: true,
    })}`;
  } catch {
    return 'Not verified yet';
  }
}

export function ConnectionsTable({
  connections,
  canManage,
  totpStatuses,
  statusesLoading,
  onReconnect,
  onManage,
  onMakePermanent,
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

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Header: title, count, and search. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <span className="text-sm text-foreground">Connections</span>
        <span className="inline-flex rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-[0.08em] text-foreground">
          {connections.length}
        </span>
        <div className="relative ml-auto w-full sm:w-56">
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
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {visible.length === 0 && (
        <div className="border-t border-border px-4 py-10 text-center text-[13px] text-muted-foreground">
          No connections match &ldquo;{query.trim()}&rdquo;.
        </div>
      )}

      {visible.map((connection) => {
        const vendorName = connection.displayName || connection.hostname;
        const isPassword = methodOf(connection) === 'password';
        const isReconnect =
          connection.status === 'needs_reauth' || connection.status === 'blocked';
        // Only password, non-reconnect rows are ambiguous until statuses load.
        const loading =
          isPassword &&
          !isReconnect &&
          statusesLoading &&
          !(connection.id in totpStatuses);
        const state = permanenceStateOf({
          connection,
          totpConfigured: totpStatuses[connection.id] ?? false,
        });
        const meta = permanenceMeta(state);
        const methodLabel =
          state === 'permanent'
            ? 'Password + authenticator'
            : isPassword
              ? 'Password'
              : 'SSO';
        const line = [connection.loginIdentity || null, methodLabel, lastVerified(connection)]
          .filter(Boolean)
          .join(' · ');
        const hint = permanenceHint({
          state,
          vendorName,
          blockedReason: connection.blockedReason,
        });
        const hintMuted = state === 'permanent' || state === 'sso';

        return (
          <div
            key={connection.id}
            className="flex flex-wrap items-start gap-3 border-t border-border px-4 py-3.5 transition-colors hover:bg-muted/40"
          >
            <div className="flex-none pt-0.5">
              <VendorLogo hostname={connection.hostname} size={32} />
            </div>

            <div className="min-w-0 flex-1 basis-[280px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-foreground">{vendorName}</span>
                {loading ? (
                  <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Checking…
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {meta.badge}
                  </span>
                )}
              </div>
              <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{line}</div>
              {!loading && hint && (
                <div
                  className="mt-1.5 max-w-[560px] text-[12px] leading-snug"
                  style={{ color: hintMuted ? 'var(--muted-foreground)' : meta.color }}
                >
                  {hint}
                </div>
              )}
            </div>

            <div className="ml-auto flex flex-none items-center gap-2 pt-0.5">
              {canManage && !loading && meta.action === 'key' && (
                <Button size="sm" variant="outline" onClick={() => onMakePermanent(connection)}>
                  Make permanent
                </Button>
              )}
              {canManage && meta.action === 'reconnect' && (
                <Button
                  size="sm"
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
          </div>
        );
      })}

      {filtered.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <span className="text-[12px] text-muted-foreground">
            {filtered.length} connections
          </span>
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
        </div>
      )}
    </div>
  );
}
