'use server';

import { sendIntegrationResults } from '@/jobs/tasks/integration/integration-results';
import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { runs, tasks } from '@trigger.dev/sdk/v3';
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

  const integrations = await db.integration.findMany({
    where: {
      organizationId: orgId,
      integrationId: {
        in: ['aws', 'gcp', 'azure'],
      },
    },
    select: {
      id: true,
      name: true,
      integrationId: true,
      settings: true,
      userSettings: true,
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!integrations) {
    return {
      success: false,
      errors: ['No integrations found'],
    };
  }

  const batchHandle = await tasks.batchTrigger<typeof sendIntegrationResults>(
    'send-integration-results',
    integrations.map((integration) => ({
      payload: {
        integration: {
          id: integration.id,
          name: integration.name,
          integration_id: integration.integrationId,
          settings: integration.settings,
          user_settings: integration.userSettings,
          organization: integration.organization,
        },
      },
    })),
  );

  let existingRuns = await runs.list({
    status: 'EXECUTING',
    batch: batchHandle.batchId,
  });

  while (existingRuns.data.length > 0) {
    console.log(`Waiting for existing runs to complete: ${existingRuns.data.length}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    existingRuns = await runs.list({
      status: 'EXECUTING',
      batch: batchHandle.batchId,
    });
  }

  revalidatePath(`/${orgId}/tests/dashboard`);
  return {
    success: true,
    errors: null,
  };
};
