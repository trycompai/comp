'use server';

import { auth as appAuth } from '@/utils/auth';
import { db } from '@db/server';
import { auth } from '@trigger.dev/sdk';
import { cookies, headers } from 'next/headers';

/**
 * Confirms the run id was actually issued for the caller's active
 * organization before we mint a token scoped to it. A run id is legitimate
 * only if it is recorded on one of the org-scoped records that store
 * trigger.dev run ids: an onboarding job, a knowledge base document's
 * processing run, or a cloud security remediation batch.
 */
async function isRunOwnedByOrganization(runId: string, organizationId: string): Promise<boolean> {
  const [onboarding, knowledgeBaseDocument, remediationBatch] = await Promise.all([
    db.onboarding.findFirst({
      where: { organizationId, triggerJobId: runId },
      select: { organizationId: true },
    }),
    db.knowledgeBaseDocument.findFirst({
      where: { organizationId, triggerRunId: runId },
      select: { id: true },
    }),
    db.remediationBatch.findFirst({
      where: { organizationId, triggerRunId: runId },
      select: { id: true },
    }),
  ]);

  return onboarding !== null || knowledgeBaseDocument !== null || remediationBatch !== null;
}

// Server action that can set cookies (called from client components or forms)
export async function healAndSetAccessToken(triggerJobId: string): Promise<string | null> {
  try {
    const session = await appAuth.api.getSession({ headers: await headers() });
    const organizationId = session?.session.activeOrganizationId;

    if (!organizationId) {
      return null;
    }

    const isOwned = await isRunOwnedByOrganization(triggerJobId, organizationId);

    if (!isOwned) {
      return null;
    }

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
    const session = await appAuth.api.getSession({ headers: await headers() });
    const organizationId = session?.session.activeOrganizationId;

    if (!organizationId) {
      return null;
    }

    const isOwned = await isRunOwnedByOrganization(triggerJobId, organizationId);

    if (!isOwned) {
      return null;
    }

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
