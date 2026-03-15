import { getActiveEnv } from './config';
import { die } from './utils';

export async function adminFetch(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const env = getActiveEnv();
  if (!env) {
    die('No environment configured. Run: comp init');
  }

  const url = `${env.apiUrl}/v1/admin/${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.adminSecret}`,
        ...options.headers,
      },
    });
  } catch {
    die(`Cannot connect to ${env.apiUrl} — is the API running?`);
  }

  if (!response.ok) {
    const body = await response.text();
    die(`API error ${response.status}: ${body}`);
  }

  return response.json();
}
