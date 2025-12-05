'use server';

import { runIntegrationTests } from '@/trigger/tasks/integration/run-integration-tests';
import { auth } from '@/utils/auth';
import { tasks } from '@trigger.dev/sdk';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

export const runTests = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      success: false,
      errors: ['Unauthorized'],
    };
  }

  const orgId = session.session?.activeOrganizationId;
  if (!orgId) {
    return {
      success: false,
      errors: ['No active organization'],
    };
  }

  try {
    const handle = await tasks.trigger<typeof runIntegrationTests>('run-integration-tests', {
      organizationId: orgId,
    });

    const headersList = await headers();
    let path = headersList.get('x-pathname') || headersList.get('referer') || '';
    path = path.replace(/\/[a-z]{2}\//, '/');

    revalidatePath(path);

    return {
      success: true,
      errors: null,
      taskId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    };
  } catch (error) {
    console.error('Error triggering integration tests:', error);

    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Failed to trigger integration tests'],
    };
  }
};
