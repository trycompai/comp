import { adminFetch } from '../client';
import { extractFlag, output } from '../utils';

export async function auditLogsCommand(args: string[]): Promise<void> {
  const params = new URLSearchParams();

  const orgId = extractFlag(args, '--org-id');
  if (orgId) params.set('orgId', orgId);

  const entityType = extractFlag(args, '--entity-type');
  if (entityType) params.set('entityType', entityType);

  const limit = extractFlag(args, '--limit') ?? '50';
  params.set('limit', limit);

  const offset = extractFlag(args, '--offset') ?? '0';
  params.set('offset', offset);

  const result = await adminFetch(`audit-logs?${params.toString()}`);
  output(result);
}
