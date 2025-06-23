'use server';

import { client } from '@comp/kv';

// Generate URL-safe unique IDs using Math.random and Date.now
const generateSetupId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${randomPart}`.substring(0, 12);
};

export interface SetupSession {
  id: string;
  userId: string;
  organizationId?: string;
  completedSteps: string[];
  currentStep: string;
  formData: Record<string, any>;
  createdAt: number;
  expiresAt: number;
}

const SETUP_SESSION_TTL = 60 * 60 * 24; // 24 hours in seconds
const SETUP_SESSION_PREFIX = 'setup:session:';

export async function createSetupSession(
  userId: string,
  initialData?: Partial<SetupSession>,
): Promise<SetupSession> {
  const id = generateSetupId();
  const now = Date.now();

  const session: SetupSession = {
    id,
    userId,
    completedSteps: [],
    currentStep: 'start',
    formData: {},
    createdAt: now,
    expiresAt: now + SETUP_SESSION_TTL * 1000,
    ...initialData,
  };

  // Store in KV with TTL
  await client.set(`${SETUP_SESSION_PREFIX}${id}`, session, {
    ex: SETUP_SESSION_TTL,
  });

  return session;
}

export async function getSetupSession(setupId: string): Promise<SetupSession | null> {
  const session = await client.get(`${SETUP_SESSION_PREFIX}${setupId}`);

  if (!session) {
    return null;
  }

  // Check if session is expired
  const setupSession = session as SetupSession;
  if (setupSession.expiresAt < Date.now()) {
    await deleteSetupSession(setupId);
    return null;
  }

  return setupSession;
}

export async function updateSetupSession(
  setupId: string,
  updates: Partial<SetupSession>,
): Promise<SetupSession | null> {
  const session = await getSetupSession(setupId);

  if (!session) {
    return null;
  }

  const updatedSession = {
    ...session,
    ...updates,
    formData: {
      ...session.formData,
      ...(updates.formData || {}),
    },
  };

  // Refresh TTL on update
  await client.set(`${SETUP_SESSION_PREFIX}${setupId}`, updatedSession, {
    ex: SETUP_SESSION_TTL,
  });

  return updatedSession;
}

export async function deleteSetupSession(setupId: string): Promise<void> {
  await client.del(`${SETUP_SESSION_PREFIX}${setupId}`);
}

export async function addCompletedStep(
  setupId: string,
  step: string,
): Promise<SetupSession | null> {
  const session = await getSetupSession(setupId);

  if (!session) {
    return null;
  }

  const completedSteps = session.completedSteps.includes(step)
    ? session.completedSteps
    : [...session.completedSteps, step];

  return updateSetupSession(setupId, {
    completedSteps,
    currentStep: step,
  });
}
