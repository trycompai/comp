import { adminFetch } from '../client';
import { extractFlag, output, die } from '../utils';

export async function usersCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (subcommand === 'search') {
    const email = extractFlag(args, '--email');
    if (!email) die('--email is required for search');
    const result = await adminFetch(`users/search?email=${encodeURIComponent(email)}`);
    output(result);
    return;
  }

  if (subcommand === 'platform-admin') {
    const id = args[1];
    if (!id) die('User ID is required');
    const result = await adminFetch(`users/${id}/platform-admin`, {
      method: 'POST',
    });
    output(result);
    return;
  }

  if (subcommand && !subcommand.startsWith('--')) {
    const user = await adminFetch(`users/${subcommand}`);
    output(user);
    return;
  }

  const limit = extractFlag(args, '--limit') ?? '20';
  const offset = extractFlag(args, '--offset') ?? '0';
  const result = await adminFetch(`users?limit=${limit}&offset=${offset}`);
  output(result);
}
