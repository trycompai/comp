import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk';
import { migratePoliciesForOrg } from './migrate-policies-for-org';

const ORG_BATCH_SIZE = 20;

export const migratePoliciesForAllOrgs = task({
  id: 'migrate-policies-for-all-orgs',
  run: async () => {
    // Count total legacy policies
    const totalLegacyPolicies = await db.policy.count({
      where: {
        versions: { none: {} },
      },
    });

    logger.info(`Total legacy policies across all orgs: ${totalLegacyPolicies}`);

    if (totalLegacyPolicies === 0) {
      return {
        totalOrgs: 0,
        totalPolicies: 0,
        successful: 0,
        failed: 0,
        message: 'No policies need migration',
      };
    }

    // Find orgs with legacy policies, ordered by most recent policy activity
    const orgsWithActivity = await db.policy.groupBy({
      by: ['organizationId'],
      where: {
        versions: { none: {} },
      },
      _max: {
        updatedAt: true,
      },
      orderBy: {
        _max: {
          updatedAt: 'desc',
        },
      },
    });

    if (orgsWithActivity.length === 0) {
      return {
        totalOrgs: 0,
        totalPolicies: totalLegacyPolicies,
        successful: 0,
        failed: 0,
        message: 'No organizations need migration',
      };
    }

    // Get org details
    const orgsWithLegacyPolicies = await db.organization.findMany({
      where: {
        id: { in: orgsWithActivity.map((org) => org.organizationId) },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Sort orgs by the activity order from groupBy
    const orgActivityOrder = new Map(
      orgsWithActivity.map((org, index) => [org.organizationId, index]),
    );
    orgsWithLegacyPolicies.sort(
      (a, b) =>
        (orgActivityOrder.get(a.id) ?? 0) - (orgActivityOrder.get(b.id) ?? 0),
    );

    logger.info(
      `Found ${orgsWithLegacyPolicies.length} orgs with legacy policies (most active first)`,
    );

    if (orgsWithLegacyPolicies.length === 0) {
      return {
        totalOrgs: 0,
        totalPolicies: totalLegacyPolicies,
        successful: 0,
        failed: 0,
        message: 'No organizations need migration',
      };
    }

    // Process orgs in batches to avoid overwhelming the system
    let totalSuccessful = 0;
    let totalFailed = 0;

    for (let i = 0; i < orgsWithLegacyPolicies.length; i += ORG_BATCH_SIZE) {
      const batch = orgsWithLegacyPolicies.slice(i, i + ORG_BATCH_SIZE);
      const batchNumber = Math.floor(i / ORG_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(
        orgsWithLegacyPolicies.length / ORG_BATCH_SIZE,
      );

      logger.info(
        `Processing org batch ${batchNumber}/${totalBatches} (${batch.length} orgs)`,
      );

      try {
        const batchResult = await migratePoliciesForOrg.batchTriggerAndWait(
          batch.map((org) => ({
            payload: { organizationId: org.id },
          })),
        );

        const successful = batchResult.runs.filter((run) => run.ok).length;
        const failed = batchResult.runs.filter((run) => !run.ok).length;

        totalSuccessful += successful;
        totalFailed += failed;

        logger.info(
          `Batch ${batchNumber} complete: ${successful} successful, ${failed} failed`,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Batch ${batchNumber} failed entirely: ${errorMsg}`);
        totalFailed += batch.length;
      }
    }

    logger.info(
      `Migration complete: ${totalSuccessful} orgs successful, ${totalFailed} orgs failed`,
    );

    return {
      totalOrgs: orgsWithLegacyPolicies.length,
      totalPolicies: totalLegacyPolicies,
      successful: totalSuccessful,
      failed: totalFailed,
      message: `Migrated policies for ${totalSuccessful}/${orgsWithLegacyPolicies.length} organizations`,
    };
  },
});
