# Training Video Completion Backfill Jobs

This directory contains Trigger.dev jobs to backfill training video completion records for existing organizations and members.

## Overview

When the training video completion tracking feature was implemented, existing members in organizations did not have the required `EmployeeTrainingVideoCompletion` records. These jobs ensure all existing members have proper training video completion tracking.

## Jobs

### 1. `backfill-training-videos-for-all-orgs`

- **Purpose**: Processes all organizations in the system
- **Trigger ID**: `backfill-training-videos-for-all-orgs`
- **Behavior**:
  - Finds all organizations
  - Creates batch jobs for each organization
  - Uses `batchTrigger` to process organizations in parallel

### 2. `backfill-training-videos-for-org`

- **Purpose**: Processes a single organization
- **Trigger ID**: `backfill-training-videos-for-org`
- **Payload**: `{ organizationId: string }`
- **Behavior**:
  - Finds all members in the organization
  - Creates `EmployeeTrainingVideoCompletion` records for each member
  - Uses `skipDuplicates: true` to prevent duplicate records
  - Processes each member individually with error handling

## Duplicate Prevention

Both jobs use `skipDuplicates: true` when creating records, which means:

- ✅ Safe to run multiple times
- ✅ Won't create duplicate records
- ✅ Only creates missing records

## Usage

### Option 1: Via Script (Recommended for testing)

```bash
# Backfill all organizations
bun run scripts/backfill-training-videos.ts

# Backfill specific organization
bun run scripts/backfill-training-videos.ts --org org_123456789
```

### Option 2: Via Server Action (For admin UI)

```typescript
import { triggerTrainingVideoBackfill } from '@/actions/admin/trigger-training-video-backfill';

// Backfill all organizations
await triggerTrainingVideoBackfill({ organizationId: undefined });

// Backfill specific organization
await triggerTrainingVideoBackfill({ organizationId: 'org_123456789' });
```

### Option 3: Direct Trigger.dev API

```typescript
import { backfillTrainingVideosForAllOrgs } from '@/jobs/tasks/onboarding/backfill-training-videos-for-all-orgs';

await backfillTrainingVideosForAllOrgs.trigger();
```

## Monitoring

- Monitor job progress in the Trigger.dev dashboard
- Each job provides detailed logging including:
  - Number of organizations processed
  - Number of members processed per organization
  - Number of records created
  - Error details for any failures

## Expected Results

After running the backfill:

- All existing members will have `EmployeeTrainingVideoCompletion` records
- Records will have `completedAt: null` (indicating not yet completed)
- Employee progress charts will show accurate data
- Training video tracking will work correctly for all members

## Safety Features

- **Idempotent**: Safe to run multiple times
- **Error Isolation**: Failure processing one member doesn't stop others
- **Comprehensive Logging**: Full audit trail of what was processed
- **Permission Checks**: Admin/owner permissions required for triggers
- **Batch Processing**: Efficient processing of large datasets

## Database Impact

- Creates records in `EmployeeTrainingVideoCompletion` table
- Number of records = (Number of members) × (Number of training videos)
- Current training videos: 5 (sat-1 through sat-5)
- Uses database transactions for consistency

## Rollback

If you need to remove the backfilled records:

```sql
-- Remove all training video completion records with null completedAt
DELETE FROM "EmployeeTrainingVideoCompletion"
WHERE "completedAt" IS NULL;
```

⚠️ **Warning**: Only run this if you're sure you want to remove ALL incomplete training records.
