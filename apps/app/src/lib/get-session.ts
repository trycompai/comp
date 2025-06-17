import { auth } from '@/utils/auth';
import { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';
import { redirect } from 'next/navigation';

export async function getServersideSession({
  headers,
  redirectTo = '/',
}: {
  headers: ReadonlyHeaders;
  redirectTo?: string;
}) {
  const response = await auth.api.getSession({
    headers,
  });

  if (!response) {
    redirect(redirectTo);
  }

  return response;
}
