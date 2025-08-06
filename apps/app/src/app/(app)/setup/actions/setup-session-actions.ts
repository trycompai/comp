'use server';

import { auth } from '@/utils/auth';
import { getGT } from 'gt-next/server';
import { headers } from 'next/headers';
import {
  deleteSetupSession,
  getSetupSession,
  updateSetupSession as updateSession,
  type SetupSession,
} from '../lib/setup-session';

export async function updateSetupSessionAction(
  setupId: string,
  updates: Partial<SetupSession>,
): Promise<SetupSession | null> {
  const t = await getGT();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error(t('Not authenticated'));
  }

  // Verify the setup session belongs to this user
  const setupSession = await getSetupSession(setupId);
  if (!setupSession || setupSession.userId !== session.user.id) {
    throw new Error(t('Invalid setup session'));
  }

  return updateSession(setupId, updates);
}

export async function deleteSetupSessionAction(setupId: string): Promise<void> {
  const t = await getGT();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error(t('Not authenticated'));
  }

  // Verify the setup session belongs to this user
  const setupSession = await getSetupSession(setupId);
  if (!setupSession || setupSession.userId !== session.user.id) {
    throw new Error(t('Invalid setup session'));
  }

  return deleteSetupSession(setupId);
}
