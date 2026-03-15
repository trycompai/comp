import { adminFetch } from '../client';
import { extractFlag, output } from '../utils';

export async function orgsCommand(args: string[]): Promise<void> {
  const id = args[0];

  if (id && !id.startsWith('--')) {
    const org = await adminFetch(`orgs/${id}`);
    output(org);
    return;
  }

  const limit = extractFlag(args, '--limit') ?? '20';
  const offset = extractFlag(args, '--offset') ?? '0';
  const result = await adminFetch(`orgs?limit=${limit}&offset=${offset}`);
  output(result);
}
