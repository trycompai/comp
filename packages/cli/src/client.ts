import { getActiveEnv, getActiveSession } from './config';
import { die } from './utils';

export async function adminFetch(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const env = getActiveEnv();
  if (!env) {
    die('No environment configured. Run: comp init');
  }

  const session = getActiveSession();
  if (!session) {
    die('Session expired or not logged in. Run: comp login');
  }

  const url = `${env.apiUrl}/v1/admin/${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
        ...options.headers,
      },
    });
  } catch {
    die(`Cannot connect to ${env.apiUrl} — is the API running?`);
  }

  if (response.status === 401) {
    die('Session expired. Run: comp login');
  }

  if (response.status === 403) {
    die('Access denied — your account does not have platform admin privileges.');
  }

  if (!response.ok) {
    const body = await response.text();
    die(`API error ${response.status}: ${body}`);
  }

  return response.json();
}
