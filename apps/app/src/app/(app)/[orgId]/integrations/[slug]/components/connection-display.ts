import type { ConnectionListItem } from '@/hooks/use-integration-platform';

/** Human-readable label for a connection (matches AccountSelector). */
export function getConnectionDisplayLabel(connection: ConnectionListItem): string {
  const meta = (connection.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.connectionName === 'string' && meta.connectionName) {
    return meta.connectionName;
  }
  if (typeof meta.accountId === 'string' && meta.accountId) {
    return `AWS ${meta.accountId}`;
  }
  const roleArn = meta.roleArn as string | undefined;
  const arnMatch = roleArn?.match(/arn:aws:iam::(\d{12})/);
  if (arnMatch) return `AWS ${arnMatch[1]}`;
  return `Account ${connection.id.slice(4, 12)}`;
}

export function getRegionCount(connection: ConnectionListItem | null): number {
  if (!connection) return 0;
  const meta = (connection.metadata ?? {}) as Record<string, unknown>;
  if (Array.isArray(meta.regions)) return meta.regions.length;
  return 0;
}
