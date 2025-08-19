'use server';

import { auth } from '@trigger.dev/sdk';
import { cookies } from 'next/headers';

// Server action that can set cookies (called from client components or forms)
export async function healAndSetAccessToken(triggerJobId: string): Promise<string | null> {
  try {
    const cookieStore = await cookies();

    const token = await auth.createPublicToken({
      scopes: {
        read: {
          runs: [triggerJobId],
        },
      },
    });

    cookieStore.set('publicAccessToken', token);

    return token;
  } catch (error) {
    console.error('Failed to heal and set access token:', error);
    return null;
  }
}

// Helper function for server components (doesn't set cookies)
export async function createAccessToken(triggerJobId: string): Promise<string | null> {
  try {
    const token = await auth.createPublicToken({
      scopes: {
        read: {
          runs: [triggerJobId],
        },
      },
    });

    return token;
  } catch (error) {
    console.error('Failed to create access token:', error);
    return null;
  }
}
