'use server';

import { createSafeActionClient } from 'next-safe-action';
import { headers } from 'next/headers';
import { auth } from '../lib/auth';

export const logout = createSafeActionClient().action(async () => {
  await auth.api.signOut({
    headers: await headers(),
  });
});
