# Portal Training Video Completions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate training video completion flow from direct DB access to RBAC-guarded NestJS API endpoints with SWR hooks for reactive UI.

**Architecture:** New `portal` permission resource grants employees self-service access. Two new NestJS endpoints (`GET /v1/training/completions`, `POST /v1/training/completions/:videoId/complete`) replace the portal's direct DB route. Portal components consume a shared SWR hook for reactive data with optimistic updates.

**Tech Stack:** NestJS (API), better-auth RBAC, SWR (portal), Prisma (DB)

**Spec:** `docs/superpowers/specs/2026-03-13-portal-training-completions-design.md`

---

## Chunk 1: RBAC Permission + API Endpoints

### Task 1: Add `portal` permission resource

**Files:**
- Modify: `packages/auth/src/permissions.ts`

- [ ] **Step 1: Add `portal` to the statement object**

In `packages/auth/src/permissions.ts`, add after the `training` line:

```typescript
// Portal self-service resources (scoped to authenticated user's own data)
portal: ['read', 'update'],
```

- [ ] **Step 2: Grant `portal` to owner role**

In the `owner` role definition, add after `training: ['read', 'update'],`:

```typescript
// Portal self-service
portal: ['read', 'update'],
```

- [ ] **Step 3: Grant `portal` to admin role**

In the `admin` role definition, add after `training: ['read', 'update'],`:

```typescript
// Portal self-service
portal: ['read', 'update'],
```

- [ ] **Step 4: Grant `portal` to employee role**

In the `employee` role definition, add `portal`:

```typescript
export const employee = ac.newRole({
  policy: ['read'],
  portal: ['read', 'update'],
});
```

- [ ] **Step 5: Grant `portal` to contractor role**

In the `contractor` role definition, add `portal`:

```typescript
export const contractor = ac.newRole({
  policy: ['read'],
  portal: ['read', 'update'],
});
```

- [ ] **Step 6: Add `portal` to GRCResource type**

In `apps/api/src/auth/require-permission.decorator.ts`, add `'portal'` to the `GRCResource` type union:

```typescript
export type GRCResource =
  | 'organization'
  // ... existing entries ...
  | 'trust'
  | 'portal';
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit --project packages/auth/tsconfig.json && npx tsc --noEmit --project apps/api/tsconfig.json`

- [ ] **Step 8: Commit**

```bash
git add packages/auth/src/permissions.ts apps/api/src/auth/require-permission.decorator.ts
git commit -m "feat(auth): add portal permission resource for employee self-service"
```

---

### Task 2: Add `getCompletions` and `markVideoComplete` to TrainingService

**Files:**
- Modify: `apps/api/src/training/training.service.ts`

- [ ] **Step 1: Write the `getCompletions` method**

Add to `TrainingService` class in `apps/api/src/training/training.service.ts`. Add `NotFoundException` and `BadRequestException` to the imports from `@nestjs/common`:

```typescript
/**
 * Get all training video completions for a member (portal self-service)
 */
async getCompletions(memberId: string, organizationId: string) {
  const member = await db.member.findFirst({
    where: { id: memberId, organizationId, deactivated: false },
  });

  if (!member) {
    throw new NotFoundException('Member not found');
  }

  return db.employeeTrainingVideoCompletion.findMany({
    where: { memberId },
  });
}
```

- [ ] **Step 2: Write the `markVideoComplete` method**

Add to `TrainingService` class:

```typescript
/**
 * Mark a training video as complete for a member (portal self-service)
 * Creates the record if it doesn't exist, updates completedAt if null.
 * Triggers completion email via Trigger.dev if all training is now done.
 */
async markVideoComplete(
  memberId: string,
  organizationId: string,
  videoId: string,
) {
  if (!TRAINING_VIDEO_IDS.includes(videoId)) {
    throw new BadRequestException(`Invalid video ID: ${videoId}`);
  }

  const member = await db.member.findFirst({
    where: { id: memberId, organizationId, deactivated: false },
  });

  if (!member) {
    throw new NotFoundException('Member not found');
  }

  // Upsert: create if not exists, update completedAt if null
  let record = await db.employeeTrainingVideoCompletion.findFirst({
    where: { videoId, memberId },
  });

  if (!record) {
    record = await db.employeeTrainingVideoCompletion.create({
      data: {
        videoId,
        memberId,
        completedAt: new Date(),
      },
    });
  } else if (!record.completedAt) {
    record = await db.employeeTrainingVideoCompletion.update({
      where: { id: record.id },
      data: { completedAt: new Date() },
    });
  }

  // Check if all training is now complete and send email if so
  const allComplete = await this.hasCompletedAllTraining(memberId);
  if (allComplete) {
    try {
      await this.sendTrainingCompletionEmailIfComplete(
        memberId,
        organizationId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send training completion email for member ${memberId}:`,
        error,
      );
      // Don't fail the request if email fails
    }
  }

  return record;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit --project apps/api/tsconfig.json`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/training/training.service.ts
git commit -m "feat(api): add getCompletions and markVideoComplete to TrainingService"
```

---

### Task 3: Add new controller endpoints

**Files:**
- Modify: `apps/api/src/training/training.controller.ts`

- [ ] **Step 1: Add imports**

Add `Get` and `Param` to the `@nestjs/common` import. Add `MemberId` to the auth-context import:

```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
```

```typescript
import { OrganizationId, MemberId } from '../auth/auth-context.decorator';
```

- [ ] **Step 2: Add GET completions endpoint**

Add to `TrainingController` class:

```typescript
@Get('completions')
@RequirePermission('portal', 'read')
@ApiOperation({
  summary: 'Get training video completions for the authenticated user',
  description:
    'Returns all training video completion records for the authenticated member. Requires session authentication.',
})
@ApiResponse({
  status: 200,
  description: 'List of training video completion records',
})
async getCompletions(
  @MemberId() memberId: string | undefined,
  @OrganizationId() organizationId: string,
) {
  if (!memberId) {
    throw new BadRequestException('Session authentication required');
  }
  return this.trainingService.getCompletions(memberId, organizationId);
}
```

- [ ] **Step 3: Add POST mark complete endpoint**

Add to `TrainingController` class:

```typescript
@Post('completions/:videoId/complete')
@HttpCode(HttpStatus.OK)
@RequirePermission('portal', 'update')
@ApiOperation({
  summary: 'Mark a training video as complete',
  description:
    'Marks a specific training video as completed for the authenticated member. Triggers completion email if all training is now done.',
})
@ApiResponse({
  status: 200,
  description: 'The updated completion record',
})
async markVideoComplete(
  @MemberId() memberId: string | undefined,
  @OrganizationId() organizationId: string,
  @Param('videoId') videoId: string,
) {
  if (!memberId) {
    throw new BadRequestException('Session authentication required');
  }
  return this.trainingService.markVideoComplete(
    memberId,
    organizationId,
    videoId,
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit --project apps/api/tsconfig.json`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/training/training.controller.ts
git commit -m "feat(api): add portal training completion endpoints"
```

---

### Task 4: Write API tests

**Files:**
- Modify: `apps/api/src/training/training.controller.spec.ts`

- [ ] **Step 1: Read the existing test file to understand the test patterns**

Run: `cat apps/api/src/training/training.controller.spec.ts`

- [ ] **Step 2: Add tests for GET completions endpoint**

Add a describe block for the new `getCompletions` endpoint following the existing test patterns in the file. Test:
- Returns completions when memberId is present
- Throws BadRequestException when memberId is undefined

- [ ] **Step 3: Add tests for POST mark complete endpoint**

Add a describe block for the new `markVideoComplete` endpoint. Test:
- Marks a video complete and returns the record
- Throws BadRequestException when memberId is undefined
- Calls service with correct parameters

- [ ] **Step 4: Run the tests**

Run: `cd apps/api && npx jest src/training --passWithNoTests`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/training/training.controller.spec.ts
git commit -m "test(api): add tests for portal training completion endpoints"
```

---

## Chunk 2: Portal SWR Hook + Component Refactor

### Task 5: Create `useTrainingCompletions` SWR hook

**Files:**
- Create: `apps/portal/src/hooks/use-training-completions.ts`

- [ ] **Step 1: Create the hook file**

The portal uses `NEXT_PUBLIC_API_URL` env var to reach the NestJS API. Create `apps/portal/src/hooks/use-training-completions.ts`:

```typescript
import type { EmployeeTrainingVideoCompletion } from '@db';
import { env } from '@/env.mjs';
import useSWR from 'swr';
import { toast } from 'sonner';
import { useCallback } from 'react';

const API_URL = env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const SWR_KEY = `${API_URL}/v1/training/completions`;

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Failed to fetch training completions');
  }
  return res.json();
};

export function useTrainingCompletions({
  fallbackData,
}: {
  fallbackData?: EmployeeTrainingVideoCompletion[];
} = {}) {
  const { data, error, isLoading, mutate } = useSWR<
    EmployeeTrainingVideoCompletion[]
  >(SWR_KEY, fetcher, {
    fallbackData,
    revalidateOnMount: !fallbackData,
    revalidateOnFocus: false,
  });

  const completions = Array.isArray(data) ? data : [];

  const markVideoComplete = useCallback(
    async (videoId: string) => {
      try {
        // Optimistic update using functional form to avoid race conditions
        await mutate(
          async (current) => {
            const res = await fetch(
              `${API_URL}/v1/training/completions/${videoId}/complete`,
              {
                method: 'POST',
                credentials: 'include',
              },
            );

            if (!res.ok) {
              throw new Error('Failed to mark video as completed');
            }

            const updatedRecord: EmployeeTrainingVideoCompletion =
              await res.json();

            if (!Array.isArray(current)) return [updatedRecord];

            // Replace existing record or add new one
            const exists = current.some((c) => c.videoId === videoId);
            if (exists) {
              return current.map((c) =>
                c.videoId === videoId ? updatedRecord : c,
              );
            }
            return [...current, updatedRecord];
          },
          { revalidate: false },
        );
      } catch {
        toast.error('Failed to mark video as completed');
      }
    },
    [mutate],
  );

  return {
    completions,
    isLoading,
    error,
    markVideoComplete,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit --project apps/portal/tsconfig.json`

- [ ] **Step 3: Commit**

```bash
git add apps/portal/src/hooks/use-training-completions.ts
git commit -m "feat(portal): add useTrainingCompletions SWR hook"
```

---

### Task 6: Refactor all portal training components to use SWR hook

**Important:** These three components (`VideoCarousel`, `GeneralTrainingAccordionItem`, `EmployeeTasksList`) must be refactored together in one task because removing props from a child before updating its parent would break the typecheck.

**Files:**
- Modify: `apps/portal/src/app/(app)/(home)/[orgId]/components/video/VideoCarousel.tsx`
- Modify: `apps/portal/src/app/(app)/(home)/[orgId]/components/tasks/GeneralTrainingAccordionItem.tsx`
- Modify: `apps/portal/src/app/(app)/(home)/[orgId]/components/EmployeeTasksList.tsx`

- [ ] **Step 1: Rewrite VideoCarousel**

Replace the entire file content. Key changes:
- Remove `videos` and `onVideoComplete` props
- Use `useTrainingCompletions` hook for data and mutations
- Remove all local `completedVideoIds` state — derive from SWR data
- Remove `useEffect` sync — SWR handles reactivity
- Remove raw `fetch` call — use `markVideoComplete` from hook

```typescript
'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import { useTrainingCompletions } from '@/hooks/use-training-completions';
import { useState } from 'react';
import { CarouselControls } from './CarouselControls';
import { YoutubeEmbed } from './YoutubeEmbed';

export function VideoCarousel() {
  const { completions, markVideoComplete } = useTrainingCompletions();
  const [isExecuting, setIsExecuting] = useState(false);

  // Create a map of completion records by videoId
  const completionRecordsMap = new Map(
    completions.map((record) => [record.videoId, record]),
  );

  // Merge metadata with completion status
  const mergedVideos = trainingVideos.map((metadata) => {
    const completionRecord = completionRecordsMap.get(metadata.id);
    return {
      ...metadata,
      dbRecordId: completionRecord?.id,
      isCompleted: !!completionRecord?.completedAt,
    };
  });

  // Derive completed set from SWR data
  const completedVideoIds = new Set(
    mergedVideos.filter((v) => v.isCompleted).map((v) => v.id),
  );

  // Start carousel at the last completed video
  const lastCompletedIndex = (() => {
    const completedIndices = mergedVideos
      .map((video, index) => ({ index, completed: video.isCompleted }))
      .filter((item) => item.completed)
      .map((item) => item.index);
    return completedIndices.length > 0
      ? completedIndices[completedIndices.length - 1]
      : 0;
  })();

  const [currentIndex, setCurrentIndex] = useState(lastCompletedIndex);

  const goToPrevious = () => {
    const isFirstVideo = currentIndex === 0;
    setCurrentIndex(isFirstVideo ? mergedVideos.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    const currentMetadataId = mergedVideos[currentIndex].id;
    if (!completedVideoIds.has(currentMetadataId)) return;
    const isLastVideo = currentIndex === mergedVideos.length - 1;
    setCurrentIndex(isLastVideo ? 0 : currentIndex + 1);
  };

  const handleVideoComplete = async () => {
    const currentVideo = mergedVideos[currentIndex];
    if (completedVideoIds.has(currentVideo.id)) return;

    setIsExecuting(true);
    try {
      await markVideoComplete(currentVideo.id);
    } finally {
      setIsExecuting(false);
    }
  };

  const isCurrentVideoCompleted = completedVideoIds.has(
    mergedVideos[currentIndex].id,
  );
  const hasNextVideo = currentIndex < mergedVideos.length - 1;
  const allVideosCompleted = trainingVideos.every((metadata) =>
    completedVideoIds.has(metadata.id),
  );

  return (
    <div className="space-y-4">
      {allVideosCompleted && (
        <div className="flex w-full flex-col items-center justify-center space-y-2 py-8">
          <h2 className="text-2xl font-semibold">
            All Training Videos Completed!
          </h2>
          <p className="text-muted-foreground text-center">
            You're all done, now your manager won't pester you!
          </p>
        </div>
      )}
      {!allVideosCompleted && (
        <>
          <YoutubeEmbed
            video={mergedVideos[currentIndex]}
            isCompleted={isCurrentVideoCompleted}
            onComplete={handleVideoComplete}
            isMarkingComplete={isExecuting}
            onNext={
              isCurrentVideoCompleted && hasNextVideo ? goToNext : undefined
            }
            allVideosCompleted={allVideosCompleted}
          />
          <CarouselControls
            currentIndex={currentIndex}
            total={mergedVideos.length}
            onPrevious={goToPrevious}
            onNext={
              isCurrentVideoCompleted && hasNextVideo ? goToNext : undefined
            }
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite GeneralTrainingAccordionItem**

Key changes:
- Remove `trainingVideoCompletions` prop
- Use `useTrainingCompletions` hook (shared SWR cache with VideoCarousel)
- Remove local `completedVideoIds` state
- Remove `handleVideoComplete` callback

```typescript
'use client';

import { trainingVideos } from '@/lib/data/training-videos';
import { useTrainingCompletions } from '@/hooks/use-training-completions';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  cn,
} from '@trycompai/design-system';
import { CheckmarkFilled, CircleDash } from '@trycompai/design-system/icons';
import { VideoCarousel } from '../video/VideoCarousel';

const generalTrainingVideoIds = trainingVideos
  .filter((video) => video.id.startsWith('sat-'))
  .map((video) => video.id);

export function GeneralTrainingAccordionItem() {
  const { completions } = useTrainingCompletions();

  const completedVideoIds = new Set(
    completions
      .filter(
        (c) =>
          generalTrainingVideoIds.includes(c.videoId) &&
          c.completedAt !== null,
      )
      .map((c) => c.videoId),
  );

  const hasCompletedGeneralTraining = generalTrainingVideoIds.every(
    (videoId) => completedVideoIds.has(videoId),
  );

  const completedCount = completedVideoIds.size;
  const totalCount = generalTrainingVideoIds.length;

  return (
    <div className="border rounded-xs">
      <AccordionItem value="general-training">
        <div className="px-4">
          <AccordionTrigger>
            <div className="flex items-center gap-3">
              {hasCompletedGeneralTraining ? (
                <div className="text-primary">
                  <CheckmarkFilled size={20} />
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <CircleDash size={20} />
                </div>
              )}
              <span
                className={cn(
                  'text-base',
                  hasCompletedGeneralTraining &&
                    'text-muted-foreground line-through',
                )}
              >
                Security Awareness Training
              </span>
              {!hasCompletedGeneralTraining && totalCount > 0 && (
                <Badge variant="outline">
                  {completedCount}/{totalCount}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
        </div>
        <AccordionContent>
          <div className="px-4 pb-4 space-y-4">
            <p className="text-muted-foreground text-sm">
              Complete the security awareness training videos to learn about
              best practices for keeping company data secure.
            </p>
            <VideoCarousel />
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
```

- [ ] **Step 3: Refactor EmployeeTasksList to use SWR hook**

Key changes:
- Import `useTrainingCompletions` hook
- Call the hook with `trainingVideoCompletions` as `fallbackData`
- Derive `hasCompletedGeneralTraining` from the hook's reactive `completions` data
- Remove static `trainingVideoCompletions` usage for progress calculation
- Remove `trainingVideoCompletions` prop from `GeneralTrainingAccordionItem`

Replace the training completion calculation block (the lines calculating `generalTrainingVideoIds`, `completedGeneralTrainingCount`, `hasCompletedGeneralTraining`) with:

```typescript
// Import at top of file
import { useTrainingCompletions } from '@/hooks/use-training-completions';

// Inside the component, before the fleet SWR hooks:
const { completions: trainingCompletions } = useTrainingCompletions({
  fallbackData: trainingVideoCompletions,
});
```

Replace the training completion calculation (the `generalTrainingVideoIds` / `completedGeneralTrainingCount` / `hasCompletedGeneralTraining` block) with:

```typescript
// Calculate general training completion from reactive SWR data
const generalTrainingVideoIds = trainingVideos
  .filter((video) => video.id.startsWith('sat-'))
  .map((video) => video.id);

const completedGeneralTrainingCount = trainingCompletions.filter(
  (completion) =>
    generalTrainingVideoIds.includes(completion.videoId) &&
    completion.completedAt !== null,
).length;

const hasCompletedGeneralTraining =
  completedGeneralTrainingCount === generalTrainingVideoIds.length;
```

Update the `GeneralTrainingAccordionItem` rendering — remove the `trainingVideoCompletions` prop:

```typescript
<GeneralTrainingAccordionItem />
```

- [ ] **Step 4: Typecheck all three components together**

Run: `npx tsc --noEmit --project apps/portal/tsconfig.json`

- [ ] **Step 5: Commit**

```bash
git add apps/portal/src/app/\(app\)/\(home\)/\[orgId\]/components/video/VideoCarousel.tsx apps/portal/src/app/\(app\)/\(home\)/\[orgId\]/components/tasks/GeneralTrainingAccordionItem.tsx apps/portal/src/app/\(app\)/\(home\)/\[orgId\]/components/EmployeeTasksList.tsx
git commit -m "refactor(portal): migrate training components to SWR hook"
```

---

### Task 7: Delete old portal route

**Files:**
- Delete: `apps/portal/src/app/api/portal/mark-video-completed/route.ts`

- [ ] **Step 1: Verify no other files import this route**

Run: `grep -r "mark-video-completed" apps/portal/src/ --include="*.ts" --include="*.tsx"`

Expected: No results (VideoCarousel no longer calls this route after Task 6).

- [ ] **Step 2: Delete the file**

```bash
rm apps/portal/src/app/api/portal/mark-video-completed/route.ts
```

- [ ] **Step 3: Typecheck the full portal**

Run: `npx tsc --noEmit --project apps/portal/tsconfig.json`

- [ ] **Step 4: Commit**

```bash
git add -A apps/portal/src/app/api/portal/mark-video-completed/
git commit -m "refactor(portal): delete mark-video-completed route, replaced by NestJS API"
```

---

### Task 8: Final verification

- [ ] **Step 1: Typecheck all affected packages**

Run: `npx turbo run typecheck --filter=@comp/api --filter=@comp/portal --filter=@comp/auth`

- [ ] **Step 2: Run API tests**

Run: `cd apps/api && npx jest src/training --passWithNoTests`

- [ ] **Step 3: Verify the complete data flow**

Verify these files are consistent:
- `packages/auth/src/permissions.ts` — `portal` resource exists, granted to employee/contractor/admin/owner
- `apps/api/src/training/training.controller.ts` — two new endpoints with `portal` permission
- `apps/api/src/training/training.service.ts` — `getCompletions` and `markVideoComplete` methods
- `apps/portal/src/hooks/use-training-completions.ts` — SWR hook calling API
- Portal components — all use hook, no callback props, no local completion state
- `apps/portal/src/app/api/portal/mark-video-completed/route.ts` — deleted

- [ ] **Step 4: Commit any remaining fixes**
