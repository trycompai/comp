const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const BASE_PATH = `${API_URL}/v1/framework-editor`;

export async function apiClient<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_PATH}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error: ${res.status}`);
  }
  return res.json();
}
