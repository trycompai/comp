import { db, PolicyStatus, type Prisma } from '@db';
import { logger, schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';

const POLICY_BATCH_SIZE = 50;

export const migratePoliciesForOrg = schemaTask({
  id: 'migrate-policies-for-org',
  schema: z.object({
    organizationId: z.string(),
  }),
  run: async ({ organizationId }) => {
    // Find policies without any versions
    const policiesWithoutVersions = await db.policy.findMany({
      where: {
        organizationId,
        versions: { none: {} },
      },
      select: {
        id: true,
        content: true,
        pdfUrl: true,
        status: true,
      },
    });

    if (policiesWithoutVersions.length === 0) {
      logger.info(`No policies need migration for org ${organizationId}`);
      return {
        organizationId,
        migratedCount: 0,
        totalPolicies: 0,
        skipped: true,
      };
    }

    logger.info(
      `Found ${policiesWithoutVersions.length} policies to migrate for org ${organizationId}`,
    );

    let totalMigrated = 0;
    let totalSkipped = 0;
    const errors: string[] = [];
    const totalBatches = Math.ceil(
      policiesWithoutVersions.length / POLICY_BATCH_SIZE,
    );

    for (
      let i = 0;
      i < policiesWithoutVersions.length;
      i += POLICY_BATCH_SIZE
    ) {
      const batch = policiesWithoutVersions.slice(i, i + POLICY_BATCH_SIZE);
      const batchNumber = Math.floor(i / POLICY_BATCH_SIZE) + 1;

      try {
        const result = await db.$transaction(
          async (tx) => {
            let migrated = 0;
            let skipped = 0;

            for (const policy of batch) {
              // Double-check: policy might have been migrated by lazy migration
              const existingVersion = await tx.policyVersion.findFirst({
                where: { policyId: policy.id },
                select: { id: true },
              });

              if (existingVersion) {
                // Fix orphaned state if needed
                await tx.policy.updateMany({
                  where: { id: policy.id, currentVersionId: null },
                  data: { currentVersionId: existingVersion.id },
                });
                skipped++;
                continue;
              }

              // Create version 1
              const version = await tx.policyVersion.create({
                data: {
                  policyId: policy.id,
                  version: 1,
                  content: (policy.content as Prisma.InputJsonValue[]) || [],
                  pdfUrl: policy.pdfUrl,
                  changelog: 'Migrated from legacy policy (bulk)',
                },
              });

              // Update policy - respect current policy status
              const isPublished = policy.status === PolicyStatus.published;
              
              await tx.policy.update({
                where: { id: policy.id },
                data: {
                  currentVersionId: version.id,
                  draftContent: (policy.content as Prisma.InputJsonValue[]) || [],
                  // Only set lastPublishedAt if policy is published
                  ...(isPublished ? { lastPublishedAt: new Date() } : {}),
                },
              });

              migrated++;
            }

            return { migrated, skipped };
          },
          { timeout: 30000 },
        );

        totalMigrated += result.migrated;
        totalSkipped += result.skipped;

        if (totalBatches > 1) {
          logger.info(
            `Batch ${batchNumber}/${totalBatches}: ${result.migrated} migrated, ${result.skipped} skipped`,
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(
          `Batch ${batchNumber}/${totalBatches} failed for org ${organizationId}: ${errorMsg}`,
        );
        errors.push(`Batch ${batchNumber}: ${errorMsg}`);
        // Continue with next batch
      }
    }

    const status = errors.length > 0 ? 'completed with errors' : 'completed';
    logger.info(
      `Org ${organizationId} ${status}: ${totalMigrated} migrated, ${totalSkipped} skipped`,
    );

    return {
      organizationId,
      migratedCount: totalMigrated,
      skippedCount: totalSkipped,
      totalPolicies: policiesWithoutVersions.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
