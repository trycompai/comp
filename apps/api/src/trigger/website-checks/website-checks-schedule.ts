import { db } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { runWebsiteChecks } from './run-website-checks';

const WEBSITE_TASK_TEMPLATE_IDS = [
  'frk_tt_68406f411fe27e47a0d6d5f3', // TLS / HTTPS
  'frk_tt_6840791cac0a7b780dbaf932', // Public Policies
  'frk_tt_68406a514e90bb6e32e0b107', // Contact Information
];

export const websiteChecksSchedule = schedules.task({
  id: 'website-checks-schedule',
  cron: '0 7 * * *',
  maxDuration: 1000 * 60 * 60,
  run: async (payload) => {
    logger.info('Starting daily website checks orchestrator', {
      scheduledAt: payload.timestamp,
      lastRun: payload.lastTimestamp,
    });

    const provider = await db.integrationProvider.findUnique({
      where: { slug: 'website' },
    });

    if (!provider) {
      logger.error(
        'Website IntegrationProvider not found. Run the seed migration.',
      );
      return { success: false, error: 'Provider not seeded' };
    }

    const orgsWithWebsite = await db.organization.findMany({
      where: {
        website: { not: null },
        hasAccess: true,
      },
      select: { id: true, website: true },
    });

    if (orgsWithWebsite.length === 0) {
      logger.info('No organizations with a website URL found');
      return { success: true, orgsTriggered: 0 };
    }

    logger.info(
      `Found ${orgsWithWebsite.length} organizations with websites`,
    );

    const orgsToTrigger: Array<{
      organizationId: string;
      website: string;
      connectionId: string;
      tasks: Array<{ taskId: string; taskTitle: string; templateId: string }>;
    }> = [];

    for (const org of orgsWithWebsite) {
      if (!org.website) continue;

      const tasks = await db.task.findMany({
        where: {
          organizationId: org.id,
          taskTemplateId: { in: WEBSITE_TASK_TEMPLATE_IDS },
        },
        select: { id: true, title: true, taskTemplateId: true },
      });

      if (tasks.length === 0) continue;

      let connection = await db.integrationConnection.findFirst({
        where: {
          providerId: provider.id,
          organizationId: org.id,
        },
      });

      if (!connection) {
        connection = await db.integrationConnection.create({
          data: {
            providerId: provider.id,
            organizationId: org.id,
            status: 'active',
            authStrategy: 'custom',
            variables: { website: org.website },
          },
        });
        logger.info(
          `Created website connection ${connection.id} for org ${org.id}`,
        );
      } else if (
        connection.status !== 'active' ||
        (connection.variables as Record<string, unknown> | null)?.website !==
          org.website
      ) {
        connection = await db.integrationConnection.update({
          where: { id: connection.id },
          data: {
            status: 'active',
            variables: { website: org.website },
          },
        });
      }

      orgsToTrigger.push({
        organizationId: org.id,
        website: org.website,
        connectionId: connection.id,
        tasks: tasks
          .filter(
            (t): t is typeof t & { taskTemplateId: string } =>
              !!t.taskTemplateId,
          )
          .map((t) => ({
            taskId: t.id,
            taskTitle: t.title,
            templateId: t.taskTemplateId,
          })),
      });
    }

    if (orgsToTrigger.length === 0) {
      logger.info('No organizations with matching website tasks found');
      return { success: true, orgsTriggered: 0 };
    }

    logger.info(
      `Triggering website checks for ${orgsToTrigger.length} organizations`,
    );

    const BATCH_SIZE = 500;
    const triggerPayloads = orgsToTrigger.map((o) => ({ payload: o }));
    let totalTriggered = 0;

    try {
      for (let i = 0; i < triggerPayloads.length; i += BATCH_SIZE) {
        const batch = triggerPayloads.slice(i, i + BATCH_SIZE);
        await runWebsiteChecks.batchTrigger(batch);
        totalTriggered += batch.length;

        logger.info(
          `Triggered batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} orgs`,
        );
      }

      return { success: true, orgsTriggered: totalTriggered };
    } catch (error) {
      logger.error('Failed to trigger website checks', {
        error: error instanceof Error ? error.message : String(error),
        triggeredBeforeError: totalTriggered,
      });

      return {
        success: false,
        orgsTriggered: totalTriggered,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
