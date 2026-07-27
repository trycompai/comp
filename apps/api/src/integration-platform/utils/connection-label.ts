/**
 * Human-readable label for an integration connection (one customer account).
 *
 * Mirrors the frontend `getConnectionDisplayLabel`
 * (apps/app/.../integrations/[slug]/components/connection-display.ts) so the
 * label is consistent with the account picker. Reads only `metadata` (an
 * unencrypted Json column) — never credentials — so it is safe to compute
 * server-side without decrypting anything.
 *
 * Precedence: customer-set connection name → `AWS <accountId>` →
 * `AWS <accountId-from-roleArn>` → `Account <id slice>` fallback.
 */
export function getConnectionLabel(connection: {
  id: string;
  metadata?: unknown;
}): string {
  const meta =
    connection.metadata && typeof connection.metadata === 'object'
      ? (connection.metadata as Record<string, unknown>)
      : {};

  if (typeof meta.connectionName === 'string' && meta.connectionName.trim()) {
    return meta.connectionName.trim();
  }
  if (typeof meta.accountId === 'string' && meta.accountId) {
    return `AWS ${meta.accountId}`;
  }
  if (typeof meta.roleArn === 'string') {
    const arnMatch = meta.roleArn.match(/arn:(?:aws|aws-us-gov):iam::(\d{12})/);
    if (arnMatch) return `AWS ${arnMatch[1]}`;
  }
  return `Account ${connection.id.slice(4, 12)}`;
}
