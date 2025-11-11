'use server';

import { auth as betterAuth } from '@/utils/auth';
import { auth } from '@trigger.dev/sdk';
import { headers } from 'next/headers';

export const createTriggerToken = async () => {
  const session = await betterAuth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  const orgId = session.session?.activeOrganizationId;
  if (!orgId) {
    return {
      success: false,
      error: 'No active organization',
    };
  }

  try {
    const token = await auth.createTriggerPublicToken('run-integration-tests', {
      multipleUse: true,
      expirationTime: '1hr',
    });

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error('Error creating trigger token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create trigger token',
    };
  }
};
