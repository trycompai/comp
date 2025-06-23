'use server';

import { auth } from '@/utils/auth';
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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  // Verify the setup session belongs to this user
  const setupSession = await getSetupSession(setupId);
  if (!setupSession || setupSession.userId !== session.user.id) {
    throw new Error('Invalid setup session');
  }

  return updateSession(setupId, updates);
}

export async function deleteSetupSessionAction(setupId: string): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  // Verify the setup session belongs to this user
  const setupSession = await getSetupSession(setupId);
  if (!setupSession || setupSession.userId !== session.user.id) {
    throw new Error('Invalid setup session');
  }

  return deleteSetupSession(setupId);
}
