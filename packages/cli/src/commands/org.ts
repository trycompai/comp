import { adminFetch } from '../client';
import { extractFlag, output, die } from '../utils';

const SUBCOMMANDS_WITH_STATUS = new Set(['policies', 'tasks', 'risks', 'findings']);
const VALID_SUBCOMMANDS = new Set([
  'health',
  'members',
  'policies',
  'tasks',
  'controls',
  'risks',
  'vendors',
  'frameworks',
  'findings',
  'integrations',
  'comments',
  'audit-logs',
]);

export async function orgCommand(args: string[]): Promise<void> {
  const orgId = args[0];
  if (!orgId || orgId.startsWith('--')) {
    die('Usage: comp org <orgId> <subcommand> [options]\nRun "comp help org" for details.');
  }

  const subcommand = args[1];
  if (!subcommand || subcommand.startsWith('--')) {
    die('Missing subcommand. Run "comp help org" for available subcommands.');
  }

  if (!VALID_SUBCOMMANDS.has(subcommand)) {
    die(`Unknown subcommand: ${subcommand}. Run "comp help org" for available subcommands.`);
  }

  const subArgs = args.slice(2);
  const limit = extractFlag(subArgs, '--limit');
  const offset = extractFlag(subArgs, '--offset');

  if (subcommand === 'health') {
    const result = await adminFetch(`orgs/${orgId}/health`);
    output(result);
    return;
  }

  const params = new URLSearchParams();
  if (limit) params.set('limit', limit);
  if (offset) params.set('offset', offset);

  if (SUBCOMMANDS_WITH_STATUS.has(subcommand)) {
    const status = extractFlag(subArgs, '--status');
    if (status) params.set('status', status);
  }

  const qs = params.toString();
  const path = `orgs/${orgId}/${subcommand}${qs ? `?${qs}` : ''}`;
  const result = await adminFetch(path);
  output(result);
}
