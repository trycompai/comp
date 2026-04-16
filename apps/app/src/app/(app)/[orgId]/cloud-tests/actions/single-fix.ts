'use server';

import { auth as triggerAuth, tasks } from '@trigger.dev/sdk';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';

interface SingleFixInput {
  connectionId: string;
  checkResultId: string;
  remediationKey: string;
  acknowledgment?: string;
}

export async function startSingleFix(
  input: SingleFixInput,
): Promise<{ data?: { runId: string; accessToken: string }; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    const organizationId = session.session?.activeOrganizationId;
    if (!organizationId) {
      return { error: 'No active organization' };
    }

    const handle = await tasks.trigger('remediate-single', {
      connectionId: input.connectionId,
      organizationId,
      checkResultId: input.checkResultId,
      remediationKey: input.remediationKey,
      userId: session.user.id,
      acknowledgment: input.acknowledgment,
    });

    const accessToken = await triggerAuth.createPublicToken({
      scopes: { read: { runs: [handle.id] } },
    });

    return { data: { runId: handle.id, accessToken } };
  } catch (err) {
    console.error('Failed to start single fix:', err);
    return { error: err instanceof Error ? err.message : 'Failed to start fix' };
  }
}
