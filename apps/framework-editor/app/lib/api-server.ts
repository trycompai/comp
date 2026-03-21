import { headers } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const BASE_PATH = `${API_URL}/v1/framework-editor`;

export async function serverApi<T>(path: string): Promise<T> {
  const headerStore = await headers();
  const cookieHeader = headerStore.get('cookie');

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (cookieHeader) {
    requestHeaders['Cookie'] = cookieHeader;
  }

  const res = await fetch(`${BASE_PATH}${path}`, {
    headers: requestHeaders,
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error: ${res.status}`);
  }

  return res.json();
}
