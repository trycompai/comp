'use client';

import type {
  ConnectionListItem,
  IntegrationProvider,
} from '@/hooks/use-integration-platform';
import { Badge } from '@trycompai/ui/badge';
import { Button } from '@trycompai/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe,
  Plus,
  Server,
} from 'lucide-react';

interface ConnectionSectionProps {
  provider: IntegrationProvider;
  connections: ConnectionListItem[];
  onConnect: () => void;
}

export function ConnectionSection({
  provider,
  connections,
  onConnect,
}: ConnectionSectionProps) {
  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10">
        <Server className="text-muted-foreground/40 mb-3 h-10 w-10" />
        <p className="text-muted-foreground mb-1 text-sm font-medium">
          No connections yet
        </p>
        <p className="text-muted-foreground/70 mb-4 text-xs">
          Connect your {provider.name} account to get started
        </p>
        <Button onClick={onConnect} size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Connections
          <span className="text-muted-foreground ml-1.5 font-normal">
            ({connections.length})
          </span>
        </h3>
        {provider.supportsMultipleConnections && (
          <Button variant="outline" size="sm" onClick={onConnect}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>

      <div className="divide-y rounded-lg border">
        {connections.map((connection) => (
          <ConnectionRow key={connection.id} connection={connection} />
        ))}
      </div>
    </div>
  );
}

function ConnectionRow({ connection }: { connection: ConnectionListItem }) {
  const metadata = (connection.metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (metadata.connectionName as string) ??
    (metadata.accountId as string) ??
    connection.id;
  const accountId = metadata.accountId as string | undefined;
  const regions = metadata.regions as string[] | undefined;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
          <Server className="text-muted-foreground h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{displayName}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {accountId && (
              <span className="font-mono">{accountId}</span>
            )}
            {regions && regions.length > 0 && (
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {regions.length} {regions.length === 1 ? 'region' : 'regions'}
              </span>
            )}
            {connection.lastSyncAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(connection.lastSyncAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      </div>
      <ConnectionStatusBadge status={connection.status} />
    </div>
  );
}

function ConnectionStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return (
        <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 text-xs dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-red-700 text-xs dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <AlertCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline" className="gap-1 text-xs">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      );
  }
}
