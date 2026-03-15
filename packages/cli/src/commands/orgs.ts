import { adminFetch } from '../client';
import { extractFlag, output } from '../utils';

export async function orgsCommand(args: string[]): Promise<void> {
  const sub = args[0];

  if (sub === 'search') {
    const query = extractFlag(args, '--query') ?? extractFlag(args, '-q') ?? args[1];
    if (!query) die('Search query required. Usage: comp orgs search --query <q>');
    const result = await adminFetch(`orgs/search?q=${encodeURIComponent(query)}`);
    output(result);
    return;
  }

  if (sub && !sub.startsWith('--')) {
    const org = await adminFetch(`orgs/${sub}`);
    output(org);
    return;
  }

  const limit = extractFlag(args, '--limit') ?? '20';
  const offset = extractFlag(args, '--offset') ?? '0';
  const result = await adminFetch(`orgs?limit=${limit}&offset=${offset}`);
  output(result);
}
