import { headers } from 'next/headers';
import { auth } from '../lib/auth';
import { UserMenuClient } from './user-menu-client';

export async function UserMenu({ onlySignOut }: { onlySignOut?: boolean }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return <UserMenuClient user={session?.user ?? null} onlySignOut={onlySignOut} />;
}
