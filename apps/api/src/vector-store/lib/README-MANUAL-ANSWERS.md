# Manual Answers Vector Database Integration

## Overview

Manual answers are automatically synced to the Upstash Vector database to improve AI answer generation quality. This document explains how to verify embeddings and troubleshoot sync issues.

## Embedding ID Format

When a manual answer is saved, it gets an embedding ID in the format:
```
manual_answer_{manualAnswerId}
```

For example:
- Manual Answer ID: `sqma_abc123xyz`
- Embedding ID: `manual_answer_sqma_abc123xyz`

## Verifying Embeddings

### Method 1: Check Embedding ID in Response

When you save a manual answer, the response includes the `embeddingId`:

```typescript
const result = await saveManualAnswer.execute({
  question: "What is your data retention policy?",
  answer: "We retain data for 7 years as per GDPR requirements.",
});

if (result.data?.success) {
  console.log('Embedding ID:', result.data.embeddingId);
  // Output: "manual_answer_sqma_abc123xyz"
}
```

### Method 2: Search in Upstash Vector Dashboard

1. Go to your Upstash Vector dashboard
2. Use the search/filter functionality
3. Search for the embedding ID: `manual_answer_sqma_abc123xyz`
4. Or filter by metadata:
   - `sourceType`: `manual_answer`
   - `sourceId`: `sqma_abc123xyz` (the manual answer ID)
   - `organizationId`: `org_123`

## Sync Behavior

### Synchronous Sync (Single Manual Answer)

When a user saves a manual answer:
1. Manual answer is saved to the database
2. **Immediately** synced to vector DB (~1-2 seconds)
3. Embedding ID is returned in the response
4. Manual answer is **immediately available** for answer generation

### Automatic Sync (Before Answer Generation)

Before generating answers for questionnaires:
1. `syncOrganizationEmbeddings()` is called automatically
2. This ensures all manual answers are up-to-date
3. Manual answers are included in the RAG search

### Background Sync (Delete All)

When deleting all manual answers:
1. Orchestrator task is triggered in the background
2. Deletions happen in parallel batches (50 at a time)
3. Progress can be tracked via Trigger.dev dashboard

## Troubleshooting

### Embedding Not Found

If an embedding is not found:

1. **Check if sync succeeded**: Look at the `embeddingId` field in the save response - if present, sync was successful
2. **Check logs**: Look for errors in the server logs
3. **Manual sync**: The embedding will be synced automatically on the next `syncOrganizationEmbeddings()` call
4. **Check Upstash Vector Dashboard**: Use the dashboard to search for the embedding ID or filter by metadata
5. **Check Upstash Vector**: Verify the vector database is configured correctly

### Sync Failed

If sync fails:
- The manual answer is still saved in the database
- It will be synced automatically on the next organization sync
- Check server logs for detailed error messages

## Testing

To verify that an embedding was created:

```typescript
// After saving a manual answer
const saveResult = await saveManualAnswer.execute({...});

if (saveResult.data?.embeddingId) {
  console.log('Embedding ID:', saveResult.data.embeddingId);
  // The embedding ID confirms that sync was successful
  // You can verify it exists in the Upstash Vector Dashboard
}
```

## Related Files

- `apps/app/src/lib/vector/sync/sync-manual-answer.ts` - Sync functions
- `apps/app/src/lib/vector/core/find-existing-embeddings.ts` - Functions to find embeddings by source
- `apps/app/src/jobs/tasks/vector/delete-manual-answer.ts` - Single deletion task
- `apps/app/src/jobs/tasks/vector/delete-all-manual-answers-orchestrator.ts` - Batch deletion orchestrator

