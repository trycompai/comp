#!/usr/bin/env tsx

/**
 * Script to trigger the training video completion backfill job.
 *
 * Usage:
 *   # Backfill all organizations
 *   bun run scripts/backfill-training-videos.ts
 *
 *   # Backfill specific organization
 *   bun run scripts/backfill-training-videos.ts --org <organizationId>
 *
 * This script is useful for:
 * - Running the backfill manually
 * - Testing the backfill process
 * - Running on-demand backfills for specific organizations
 */

import { backfillTrainingVideosForAllOrgs } from '@/trigger/tasks/onboarding/backfill-training-videos-for-all-orgs';
import { backfillTrainingVideosForOrg } from '@/trigger/tasks/onboarding/backfill-training-videos-for-org';

async function main() {
  const args = process.argv.slice(2);
  const orgIndex = args.indexOf('--org');
  const organizationId = orgIndex !== -1 ? args[orgIndex + 1] : null;

  try {
    if (organizationId) {
      console.log(`🚀 Triggering training video backfill for organization: ${organizationId}`);

      const handle = await backfillTrainingVideosForOrg.trigger({
        organizationId: organizationId,
      });

      console.log(`✅ Successfully triggered job with ID: ${handle.id}`);
      console.log(`📊 You can monitor the progress in the Trigger.dev dashboard`);
    } else {
      console.log('🚀 Triggering training video backfill for ALL organizations');

      const handle = await backfillTrainingVideosForAllOrgs.trigger();

      console.log(`✅ Successfully triggered batch job with ID: ${handle.id}`);
      console.log(`📊 You can monitor the progress in the Trigger.dev dashboard`);
      console.log(`⚠️  This will process ALL organizations and their members`);
    }
  } catch (error) {
    console.error('❌ Error triggering backfill job:', error);
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}
