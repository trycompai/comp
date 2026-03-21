import { headers } from 'next/headers';
import { auth } from './auth';

export function formatEnumValue(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const ALLOWED_DOMAIN = 'trycomp.ai';

export function isInternalUser(email: string): boolean {
  const parts = email.split('@');
  return parts.length === 2 && parts[1] === ALLOWED_DOMAIN;
}

export async function isAuthorized(): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return false;

  return session.user.role === 'admin' && isInternalUser(session.user.email);
}
