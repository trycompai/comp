'use client';

import { Button } from '@trycompai/design-system';
import { Renew, Settings } from '@trycompai/design-system/icons';
import { formatDistanceToNow } from 'date-fns';
import {
  hueFor,
  methodOf,
  monogram,
  statusMeta,
  type Connection,
} from './connection-format';

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

function Monogram({ hostname }: { hostname: string }) {
  return (
    <span
      className="grid h-8 w-8 flex-none place-items-center rounded-md text-[11px] font-bold text-white"
      style={{ background: hueFor(hostname) }}
    >
      {monogram(hostname)}
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
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className={HEAD}>Vendor</th>
            <th className={HEAD}>Method</th>
            <th className={HEAD}>Connected as</th>
            <th className={HEAD}>Status</th>
            <th className={HEAD}>Automations</th>
            <th className={HEAD}>Last verified</th>
            <th className={`${HEAD} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {connections.map((connection) => {
            const meta = statusMeta(connection.status);
            const method = methodOf(connection);
            return (
              <tr
                key={connection.id}
                className="border-b border-border last:border-0 hover:bg-muted/40"
              >
                <td className={CELL}>
                  <div className="flex items-center gap-3">
                    <Monogram hostname={connection.hostname} />
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
  );
}
