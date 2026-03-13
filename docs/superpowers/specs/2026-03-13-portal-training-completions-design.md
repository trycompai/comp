# Portal Training Video Completions — Design Spec

## Problem

Employees cannot reliably complete training videos in the portal. Two root causes:

1. **No RBAC coverage**: The portal's `mark-video-completed` route writes directly to the DB, bypassing the NestJS API and RBAC entirely. Employees/contractors have no `training` or `portal` permissions — their actions are unaudited.

2. **Stale UI**: Training completion data is fetched server-side in `OrganizationDashboard` and passed as static props. After marking a video complete, the progress bar and "all completed" screen never update because there's no client-side data fetching or cache invalidation.

## Design

### 1. New `portal` Permission Resource

Add `portal: ['read', 'update']` to `packages/auth/src/permissions.ts`.

- `portal:read` — view own training completions, own compliance status
- `portal:update` — mark own training videos complete

Granted to: `employee`, `contractor`, `owner`, `admin`. Not granted to `auditor` — auditors have no compliance obligations and don't use the portal.

This is separate from `training:read/update` which gates admin-level operations (send completion emails, generate certificates for any member). The `portal` permission scopes to self-service actions on the authenticated user's own data.

Add `'portal'` to the `GRCResource` type union in `require-permission.decorator.ts` (note: this type is documentation-only, not enforced at runtime by `RequirePermission`).

### 2. New NestJS API Endpoints

Add two endpoints to the existing `TrainingController`:

#### `GET /v1/training/completions`

- Guard: `@RequirePermission('portal', 'read')`
- Extracts `memberId` from `request.memberId` (session auth) — no member ID in URL
- Returns: `EmployeeTrainingVideoCompletion[]` for the authenticated user
- Scoped to session auth only (employees use cookies)

**Important**: The `@MemberId()` decorator returns `string | undefined` (it does not throw like `@UserId()`). Both endpoints must guard against undefined `memberId` and throw `BadRequestException` if missing — this protects against API key or service token requests where no member context exists.

```typescript
@Get('completions')
@RequirePermission('portal', 'read')
async getCompletions(
  @MemberId() memberId: string | undefined,
  @OrganizationId() organizationId: string,
): Promise<EmployeeTrainingVideoCompletion[]> {
  if (!memberId) {
    throw new BadRequestException('Session authentication required');
  }
  return this.trainingService.getCompletions(memberId, organizationId);
}
```

#### `POST /v1/training/completions/:videoId/complete`

- Guard: `@RequirePermission('portal', 'update')`
- Extracts `memberId` from `request.memberId` (session auth) — must guard against undefined
- Validates `videoId` against known training video IDs
- Creates or updates the `EmployeeTrainingVideoCompletion` record
- After marking complete, checks if all training is done and triggers completion email via Trigger.dev task (all emails go through Nest API → Trigger.dev for rate limiting)
- Returns: the updated `EmployeeTrainingVideoCompletion` record

```typescript
@Post('completions/:videoId/complete')
@RequirePermission('portal', 'update')
async markComplete(
  @MemberId() memberId: string | undefined,
  @OrganizationId() organizationId: string,
  @Param('videoId') videoId: string,
): Promise<EmployeeTrainingVideoCompletion> {
  if (!memberId) {
    throw new BadRequestException('Session authentication required');
  }
  return this.trainingService.markVideoComplete(memberId, organizationId, videoId);
}
```

### 3. Training Service Additions

Add two methods to `TrainingService`:

#### `getCompletions(memberId, organizationId)`

- Validates member belongs to organization
- Returns all `EmployeeTrainingVideoCompletion` records for the member

#### `markVideoComplete(memberId, organizationId, videoId)`

- Validates member belongs to organization
- Validates `videoId` is in the known `TRAINING_VIDEO_IDS` list
- Upserts the completion record (create if not exists, update `completedAt` if null)
- After success, checks if all training is complete and sends completion email if so
- Returns the upserted record

### 4. Portal SWR Hook

Create a `useTrainingCompletions` hook in the portal that:

- Fetches from `GET /v1/training/completions` via the NestJS API (using `credentials: 'include'` for session cookies)
- Accepts `fallbackData` from server-side props for SSR hydration
- Exposes a `markVideoComplete(videoId)` function that:
  - Calls `POST /v1/training/completions/:videoId/complete`
  - Optimistically updates the SWR cache using the functional `mutate` form (receives current data to avoid race conditions when marking multiple videos in succession)
  - Returns the updated record
- Uses `mutate()` for cache invalidation — no callback props needed

### 5. Portal Component Refactor

#### `EmployeeTasksList`

- Replace static `trainingVideoCompletions` prop usage with `useTrainingCompletions` hook
- Pass `trainingVideoCompletions` as `fallbackData` to the hook
- Derive `hasCompletedGeneralTraining` from the SWR data (reactive)
- Remove `useState` / `useCallback` for local completion tracking
- Remove `onVideoComplete` callback prop drilling

#### `GeneralTrainingAccordionItem`

- Consume `useTrainingCompletions` hook directly (SWR cache sharing by key)
- Remove `onVideoComplete` prop — SWR cache is shared across components using the same key
- Remove local `completedVideoIds` state — derive from SWR data

#### `VideoCarousel`

- Consume `useTrainingCompletions` hook directly
- Replace `fetch('/api/portal/mark-video-completed')` with the hook's `markVideoComplete` function
- Remove `onVideoComplete` callback prop
- Remove local `completedVideoIds` state — derive from SWR data

### 6. Portal Route Cleanup

Delete `apps/portal/src/app/api/portal/mark-video-completed/route.ts` — its logic moves to the NestJS API endpoint.

### 7. Server-Side Data Fetching

`OrganizationDashboard` continues to fetch training completions server-side via `@db` for SSR. This data is passed as `fallbackData` to the SWR hook. The `@db` read in server components is acceptable for initial page load (read-only, no mutation). This is existing tech debt — eventually these reads should migrate to `serverApi`, but that's out of scope here.

## Data Flow

```
Page Load:
  OrganizationDashboard (server) → @db → trainingVideoCompletions
    → EmployeeTasksList (client) → useTrainingCompletions(fallbackData)
      → GeneralTrainingAccordionItem → useTrainingCompletions() [shared cache]
        → VideoCarousel → useTrainingCompletions() [shared cache]

Mark Complete:
  VideoCarousel → hook.markVideoComplete(videoId)
    → POST /v1/training/completions/:videoId/complete (NestJS API)
    → SWR mutate() updates cache
    → All components re-render with new data (EmployeeTasksList progress bar, accordion badge, carousel state)
```

## Files Changed

| File | Change |
|------|--------|
| `packages/auth/src/permissions.ts` | Add `portal: ['read', 'update']` resource, grant to employee/contractor/admin/owner |
| `apps/api/src/auth/require-permission.decorator.ts` | Add `'portal'` to `GRCResource` type |
| `apps/api/src/training/training.controller.ts` | Add `GET completions` and `POST completions/:videoId/complete` endpoints |
| `apps/api/src/training/training.service.ts` | Add `getCompletions` and `markVideoComplete` methods |
| `apps/portal/src/hooks/useTrainingCompletions.ts` | New SWR hook |
| `apps/portal/src/app/(app)/(home)/[orgId]/components/EmployeeTasksList.tsx` | Use SWR hook, remove local state |
| `apps/portal/src/app/(app)/(home)/[orgId]/components/tasks/GeneralTrainingAccordionItem.tsx` | Use SWR hook, remove callback props |
| `apps/portal/src/app/(app)/(home)/[orgId]/components/video/VideoCarousel.tsx` | Use SWR hook, remove callback props and local state |
| `apps/portal/src/app/api/portal/mark-video-completed/route.ts` | Delete |

## Out of Scope

- Migrating other portal DB reads (policies, fleet) to API endpoints
- Adding `portal` permission checks to policy signing or device agent flows
- Changing the admin-facing training UI in `apps/app`
