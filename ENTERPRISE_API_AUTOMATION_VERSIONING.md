# Enterprise API - Automation Versioning Endpoints

## Overview

Implement versioning for automation scripts. The Next.js app handles database operations (storing version metadata), while the Enterprise API handles S3 operations (copying/managing script files) and Redis operations (chat history).

## Context

### Current S3 Structure

- **Draft script**: `{orgId}/{taskId}/{automationId}.automation.js`
- Scripts are stored in S3 via the enterprise API

### New S3 Structure for Versions

- **Draft script**: `{orgId}/{taskId}/{automationId}.draft.js`
- **Published versions**: `{orgId}/{taskId}/{automationId}.v{version}.js`

**Migration Note**: Existing scripts at `{automationId}.automation.js` should be moved to `{automationId}.draft.js`

### Database (handled by Next.js app)

- `EvidenceAutomationVersion` table stores version metadata
- Next.js app creates version records after enterprise API copies files

## Endpoints to Implement

### 1. Publish Draft Script

**Endpoint**: `POST /api/tasks-automations/publish`

**Purpose**: Create a new version by copying current draft script to a versioned S3 key.

**Request Body**:

```typescript
{
  orgId: string;
  taskId: string;
  automationId: string;
}
```

**Process**:

1. Construct draft S3 key: `{orgId}/{taskId}/{automationId}.draft.js`
2. Check if draft script exists in S3
3. If not found, return error: `{ success: false, error: 'No draft script found to publish' }`
4. Query database to get the next version number:
   - Find highest existing version for this `automationId`
   - Increment by 1 (or start at 1 if no versions exist)
5. Construct version S3 key: `{orgId}/{taskId}/{automationId}.v{nextVersion}.js`
6. Copy draft script to version key in S3
7. Return success with the version number and scriptKey

**Response**:

```typescript
{
  success: boolean;
  version?: number;   // e.g., 1, 2, 3
  scriptKey?: string; // e.g., "org_xxx/tsk_xxx/aut_xxx.v1.js"
  error?: string;
}
```

**Note**: Enterprise API determines the version number server-side by querying the database, not from client input. This prevents version conflicts.

**Error Cases**:

- Draft script not found in S3
- S3 copy operation fails
- Invalid orgId/taskId/automationId

---

### 2. Restore Version to Draft

**Endpoint**: `POST /api/tasks-automations/restore-version`

**Purpose**: Replace current draft script with a published version's script. Chat history is preserved.

**Request Body**:

```typescript
{
  orgId: string;
  taskId: string;
  automationId: string;
  version: number; // Which version to restore (e.g., 1, 2, 3)
}
```

**Process**:

1. Construct version S3 key: `{orgId}/{taskId}/{automationId}.v{version}.js`
2. Check if version script exists in S3
3. If not found, return error: `{ success: false, error: 'Version not found' }`
4. Construct draft S3 key: `{orgId}/{taskId}/{automationId}.draft.js`
5. Copy version script to draft key in S3 (overwrites current draft)
6. Do NOT touch Redis chat history - it should persist
7. Return success

**Response**:

```typescript
{
  success: boolean;
  error?: string;
}
```

**Error Cases**:

- Version script not found in S3
- S3 copy operation fails
- Invalid version number

---

## Implementation Notes

### S3 Operations

- Use AWS S3 SDK's `copyObject` method to copy between keys
- Bucket name should come from environment variables
- Ensure proper error handling for S3 operations

### Authentication

- These endpoints should require authentication (API key or session)
- Validate that the user has access to the organization/task/automation

### Redis Chat History

- **Important**: Do NOT clear or modify chat history when restoring versions
- Chat history key format: `automation:{automationId}:chat`
- Chat history persists regardless of which version is in the draft

### Example S3 Keys

For automation `aut_68e6a70803cf925eac17896a` in task `tsk_68e6a5c1e0b762e741c2e020`:

- **Draft**: `org_68e6a5c1d30338b3981c2104/tsk_68e6a5c1e0b762e741c2e020/aut_68e6a70803cf925eac17896a.draft.js`
- **Version 1**: `org_68e6a5c1d30338b3981c2104/tsk_68e6a5c1e0b762e741c2e020/aut_68e6a70803cf925eac17896a.v1.js`
- **Version 2**: `org_68e6a5c1d30338b3981c2104/tsk_68e6a5c1e0b762e741c2e020/aut_68e6a70803cf925eac17896a.v2.js`

### Integration Flow

#### Publishing a Version

1. User clicks "Publish" in Next.js UI with optional changelog
2. Next.js calls `POST /api/tasks-automations/publish` (no version number in request)
3. Enterprise API:
   - Queries database to get next version number
   - Copies draft → versioned S3 key
   - Returns version number and scriptKey
4. Next.js saves version record to database with returned version number, scriptKey, and changelog

#### Restoring a Version

1. User clicks "Restore Version X" in Next.js UI
2. Shows confirmation dialog warning current draft will be lost
3. Next.js calls `POST /api/tasks-automations/restore-version`
4. Enterprise API copies version script → draft S3 key
5. Enterprise API returns success
6. Next.js shows success message
7. User can continue editing in builder with restored script

### Error Handling

- Return proper HTTP status codes (404 for not found, 400 for bad request, 500 for S3 errors)
- Include descriptive error messages in response body
- Log errors for debugging

### Testing Checklist

- [ ] Can publish a draft script as version 1
- [ ] Can publish multiple versions (1, 2, 3...)
- [ ] Cannot publish if no draft exists
- [ ] Can restore version 1 to draft
- [ ] Restoring doesn't affect chat history
- [ ] S3 keys follow correct naming convention
- [ ] Proper error messages when scripts don't exist
