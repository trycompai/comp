# SALE-45 — Screenshot Automation Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three improvements to the browser-automation screenshot feature: (a) bake audit metadata (requirement text, UTC timestamp, source URL) into the screenshot image itself; (b) replace the stale-presigned-URL "Open full size" link with a stable redirect endpoint that mints a fresh URL on click; (c) diagnose and harden the "evaluation error" state.

**Architecture:** Backend changes live in `apps/api/src/browserbase/` — a new `screenshot-overlay.ts` module (pure sharp-based function), integration into `executeAutomation`, a new service method + controller endpoint for the redirect, and a surgical fix in the eval path. Frontend swaps the `<a href>` in `RunItem.tsx` from the presigned S3 URL to the new redirect path and gets vitest coverage.

**Tech Stack:** NestJS (apps/api), Next.js (apps/app), Prisma, sharp (for image compositing — already in `apps/api/package.json` at `^0.34.5`), date-fns (already present, use `format` + UTC conversion), Jest (API tests), Vitest (app tests).

**Reference spec:** `docs/specs/2026-04-22-sale-45-screenshot-automation-improvements-design.md`

---

## File Structure

**New:**
- `apps/api/src/browserbase/screenshot-overlay.ts` — pure function `renderOverlay()` using sharp
- `apps/api/src/browserbase/screenshot-overlay.spec.ts` — Jest unit tests for overlay
- `apps/api/src/browserbase/browserbase.service.spec.ts` — Jest tests for new `getScreenshotRedirectUrl`
- `apps/api/src/browserbase/browserbase.controller.spec.ts` — Jest tests for the new redirect endpoint
- `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/RunItem.test.tsx` — Vitest tests

**Modify:**
- `apps/api/src/browserbase/browserbase.service.ts` — (a) capture `page.url()` and overlay buffer before returning from `executeAutomation`; (b) add `getScreenshotRedirectUrl` method; (c) eval-error hardening in Task 6.
- `apps/api/src/browserbase/browserbase.controller.ts` — add `GET runs/:runId/screenshot` redirect endpoint.
- `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/RunItem.tsx` — swap "Open full size" and "Try direct link" hrefs to the stable redirect path.

---

## Task 1: Write failing tests for screenshot overlay module

**Files:**
- Create: `apps/api/src/browserbase/screenshot-overlay.spec.ts`

- [ ] **Step 1: Create the test file**

```typescript
// apps/api/src/browserbase/screenshot-overlay.spec.ts
import sharp from 'sharp';
import { renderOverlay, OVERLAY_HEIGHT_PX } from './screenshot-overlay';

describe('renderOverlay', () => {
  const makeSolidJpeg = async (width = 800, height = 600) => {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();
  };

  it('adds a bottom banner that increases image height by OVERLAY_HEIGHT_PX', async () => {
    const input = await makeSolidJpeg(800, 600);
    const out = await renderOverlay({
      buffer: input,
      instruction: 'Verify MFA is enforced',
      sourceUrl: 'https://github.com/settings/security',
      capturedAt: new Date('2026-04-22T14:32:07Z'),
    });
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(600 + OVERLAY_HEIGHT_PX);
    expect(meta.format).toBe('jpeg');
  });

  it('preserves non-800 widths (narrow image)', async () => {
    const input = await makeSolidJpeg(400, 300);
    const out = await renderOverlay({
      buffer: input,
      instruction: 'Check',
      sourceUrl: 'https://example.com',
      capturedAt: new Date('2026-04-22T14:32:07Z'),
    });
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300 + OVERLAY_HEIGHT_PX);
  });

  it('preserves wide widths (4000px)', async () => {
    const input = await makeSolidJpeg(4000, 1200);
    const out = await renderOverlay({
      buffer: input,
      instruction: 'Check',
      sourceUrl: 'https://example.com',
      capturedAt: new Date('2026-04-22T14:32:07Z'),
    });
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(4000);
    expect(meta.height).toBe(1200 + OVERLAY_HEIGHT_PX);
  });

  it('paints a dark banner on the bottom (top-left pixel is light source color; bottom-center is dark banner)', async () => {
    const input = await makeSolidJpeg(800, 600);
    const out = await renderOverlay({
      buffer: input,
      instruction: 'Check',
      sourceUrl: 'https://example.com',
      capturedAt: new Date('2026-04-22T14:32:07Z'),
    });
    const raw = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const { data, info } = raw;
    // Top-left pixel: source color, ~240
    const topLeft = { r: data[0], g: data[1], b: data[2] };
    expect(topLeft.r).toBeGreaterThan(200);
    // Bottom-center pixel (in the banner region): dark
    const bottomRow = info.height - Math.floor(OVERLAY_HEIGHT_PX / 2);
    const midCol = Math.floor(info.width / 2);
    const idx = (bottomRow * info.width + midCol) * info.channels;
    const bottomMid = { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
    expect(bottomMid.r).toBeLessThan(40);
    expect(bottomMid.g).toBeLessThan(40);
    expect(bottomMid.b).toBeLessThan(40);
  });

  it('truncates very long instruction text without throwing', async () => {
    const input = await makeSolidJpeg(800, 600);
    const longInstruction = 'a'.repeat(500);
    const out = await renderOverlay({
      buffer: input,
      instruction: longInstruction,
      sourceUrl: 'https://example.com',
      capturedAt: new Date('2026-04-22T14:32:07Z'),
    });
    const meta = await sharp(out).metadata();
    expect(meta.height).toBe(600 + OVERLAY_HEIGHT_PX);
  });

  it('handles unicode in instruction and URL', async () => {
    const input = await makeSolidJpeg(800, 600);
    const out = await renderOverlay({
      buffer: input,
      instruction: 'Vérifier MFA — 🔐',
      sourceUrl: 'https://exämple.com/café',
      capturedAt: new Date('2026-04-22T14:32:07Z'),
    });
    const meta = await sharp(out).metadata();
    expect(meta.height).toBe(600 + OVERLAY_HEIGHT_PX);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && npx jest src/browserbase/screenshot-overlay --passWithNoTests`
Expected: **FAIL** with `Cannot find module './screenshot-overlay'`.

- [ ] **Step 3: Commit the failing test**

```bash
git add apps/api/src/browserbase/screenshot-overlay.spec.ts
git commit -m "test(browserbase): add failing tests for screenshot overlay renderer"
```

---

## Task 2: Implement screenshot overlay module

**Files:**
- Create: `apps/api/src/browserbase/screenshot-overlay.ts`

- [ ] **Step 1: Create the module**

```typescript
// apps/api/src/browserbase/screenshot-overlay.ts
import sharp from 'sharp';

export const OVERLAY_HEIGHT_PX = 88;
const OVERLAY_BG = '#0A0A0A';
const OVERLAY_TEXT = '#FFFFFF';
const OVERLAY_MUTED = '#A1A1AA';
const MAX_INSTRUCTION_CHARS = 120;
const MAX_URL_CHARS = 140;

export interface RenderOverlayInput {
  buffer: Buffer;
  instruction: string;
  sourceUrl: string;
  capturedAt: Date;
}

/**
 * Composite an audit metadata banner onto the bottom of a screenshot.
 * The banner adds OVERLAY_HEIGHT_PX to the total image height.
 * Failure-mode contract: throws on malformed input; callers should handle and fall back to the raw image.
 */
export async function renderOverlay(input: RenderOverlayInput): Promise<Buffer> {
  const { buffer, instruction, sourceUrl, capturedAt } = input;

  const sourceMeta = await sharp(buffer).metadata();
  const width = sourceMeta.width;
  if (!width) {
    throw new Error('renderOverlay: source image has no width');
  }

  const instructionText = truncate(instruction, MAX_INSTRUCTION_CHARS);
  const sourceUrlText = truncate(sourceUrl, MAX_URL_CHARS);
  const timestampText = formatUtc(capturedAt);

  const bannerSvg = buildBannerSvg({
    width,
    height: OVERLAY_HEIGHT_PX,
    instruction: instructionText,
    sourceUrl: sourceUrlText,
    timestamp: timestampText,
  });

  const bannerBuffer = await sharp(Buffer.from(bannerSvg))
    .png()
    .toBuffer();

  // Extend the source image downward by OVERLAY_HEIGHT_PX and paint the banner there.
  const extended = await sharp(buffer)
    .extend({
      bottom: OVERLAY_HEIGHT_PX,
      background: OVERLAY_BG,
    })
    .composite([
      {
        input: bannerBuffer,
        top: sourceMeta.height ?? 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 85 })
    .toBuffer();

  return extended;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + '…';
}

function formatUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss} UTC`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface BannerArgs {
  width: number;
  height: number;
  instruction: string;
  sourceUrl: string;
  timestamp: string;
}

function buildBannerSvg(args: BannerArgs): string {
  const { width, height, instruction, sourceUrl, timestamp } = args;
  const padX = 16;
  const rowFontSize = 13;
  const labelFontSize = 11;
  const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="${OVERLAY_BG}"/>
  <g font-family='${fontFamily}' fill="${OVERLAY_TEXT}">
    <text x="${padX}" y="22" font-size="${rowFontSize}" font-weight="600">
      <tspan fill="${OVERLAY_MUTED}" font-size="${labelFontSize}">AUDITOR REQUIREMENT  </tspan>
      <tspan>${escapeXml(instruction)}</tspan>
    </text>
    <text x="${padX}" y="48" font-size="${rowFontSize}">
      <tspan fill="${OVERLAY_MUTED}" font-size="${labelFontSize}">CAPTURED  </tspan>
      <tspan>${escapeXml(timestamp)}</tspan>
    </text>
    <text x="${padX}" y="74" font-size="${rowFontSize}">
      <tspan fill="${OVERLAY_MUTED}" font-size="${labelFontSize}">SOURCE  </tspan>
      <tspan>${escapeXml(sourceUrl)}</tspan>
    </text>
  </g>
</svg>`;
}
```

- [ ] **Step 2: Run the tests and verify they pass**

Run: `cd apps/api && npx jest src/browserbase/screenshot-overlay`
Expected: **PASS** — all 6 tests green.

- [ ] **Step 3: Typecheck**

Run: `npx turbo run typecheck --filter=@trycompai/api`
Expected: **No errors.**

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/browserbase/screenshot-overlay.ts
git commit -m "feat(browserbase): add screenshot overlay renderer with audit metadata banner"
```

---

## Task 3: Integrate overlay into `executeAutomation`

**Files:**
- Modify: `apps/api/src/browserbase/browserbase.service.ts` (around lines 742-835; `executeAutomation` method)

- [ ] **Step 1: Add the import at the top of the service**

Modify `apps/api/src/browserbase/browserbase.service.ts`:

Old (line 13):
```typescript
import { getSignedUrl } from '@/app/s3';
```

New (append after that line):
```typescript
import { getSignedUrl } from '@/app/s3';
import { renderOverlay } from './screenshot-overlay';
```

- [ ] **Step 2: Capture `page.url()` and apply overlay before returning**

In `executeAutomation`, replace the block that currently takes the screenshot and returns (currently around lines 803-817). Old:

```typescript
      // Always take a screenshot at the end (no pass/fail criteria gate)
      page = await this.ensureActivePage(stagehand);
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: false,
      });

      return {
        success: true,
        screenshot: screenshot.toString('base64'),
        evaluationReason: taskContext
          ? `Navigation completed for "${taskContext.title}". Screenshot captured.`
          : 'Navigation completed. Screenshot captured.',
      };
```

New:

```typescript
      // Always take a screenshot at the end (no pass/fail criteria gate)
      page = await this.ensureActivePage(stagehand);
      const sourceUrl = page.url();
      const rawScreenshot = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: false,
      });

      let finalBuffer: Buffer = rawScreenshot;
      try {
        finalBuffer = await renderOverlay({
          buffer: rawScreenshot,
          instruction,
          sourceUrl,
          capturedAt: new Date(),
        });
      } catch (overlayErr) {
        this.logger.warn('Screenshot overlay render failed; uploading raw image', {
          error:
            overlayErr instanceof Error ? overlayErr.message : String(overlayErr),
        });
      }

      return {
        success: true,
        screenshot: finalBuffer.toString('base64'),
        evaluationReason: taskContext
          ? `Navigation completed for "${taskContext.title}". Screenshot captured.`
          : 'Navigation completed. Screenshot captured.',
      };
```

- [ ] **Step 3: Typecheck**

Run: `npx turbo run typecheck --filter=@trycompai/api`
Expected: **No errors.**

- [ ] **Step 4: Verify existing screenshot tests still pass (if any) and overlay tests still pass**

Run: `cd apps/api && npx jest src/browserbase --passWithNoTests`
Expected: **PASS.**

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/browserbase/browserbase.service.ts
git commit -m "feat(browserbase): bake audit overlay into captured screenshots"
```

---

## Task 4: Write failing test for `getScreenshotRedirectUrl` service method

**Files:**
- Create: `apps/api/src/browserbase/browserbase.service.spec.ts`

- [ ] **Step 1: Create the service spec with failing tests**

```typescript
// apps/api/src/browserbase/browserbase.service.spec.ts
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BrowserbaseService } from './browserbase.service';

jest.mock('@db', () => ({
  db: {
    browserAutomationRun: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/app/s3', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed'),
}));

import { db } from '@db';

describe('BrowserbaseService.getScreenshotRedirectUrl', () => {
  let service: BrowserbaseService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [BrowserbaseService],
    }).compile();
    service = moduleRef.get(BrowserbaseService);
  });

  it('returns a freshly minted presigned URL for an in-scope run', async () => {
    (db.browserAutomationRun.findUnique as jest.Mock).mockResolvedValue({
      id: 'bar_1',
      screenshotUrl: 'browser-automations/org_1/bau_1/bar_1.jpg',
      automation: { task: { organizationId: 'org_1' } },
    });

    const url = await service.getScreenshotRedirectUrl({
      runId: 'bar_1',
      organizationId: 'org_1',
    });

    expect(url).toBe('https://s3.example.com/signed');
    expect(db.browserAutomationRun.findUnique).toHaveBeenCalledWith({
      where: { id: 'bar_1' },
      include: { automation: { include: { task: true } } },
    });
  });

  it('throws NotFoundException when the run does not exist', async () => {
    (db.browserAutomationRun.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.getScreenshotRedirectUrl({
        runId: 'bar_missing',
        organizationId: 'org_1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when the run belongs to a different org', async () => {
    (db.browserAutomationRun.findUnique as jest.Mock).mockResolvedValue({
      id: 'bar_1',
      screenshotUrl: 'browser-automations/org_2/bau_1/bar_1.jpg',
      automation: { task: { organizationId: 'org_2' } },
    });

    await expect(
      service.getScreenshotRedirectUrl({
        runId: 'bar_1',
        organizationId: 'org_1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when the run has no screenshot', async () => {
    (db.browserAutomationRun.findUnique as jest.Mock).mockResolvedValue({
      id: 'bar_1',
      screenshotUrl: null,
      automation: { task: { organizationId: 'org_1' } },
    });

    await expect(
      service.getScreenshotRedirectUrl({
        runId: 'bar_1',
        organizationId: 'org_1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `cd apps/api && npx jest src/browserbase/browserbase.service --passWithNoTests`
Expected: **FAIL** with `service.getScreenshotRedirectUrl is not a function`.

- [ ] **Step 3: Commit the failing test**

```bash
git add apps/api/src/browserbase/browserbase.service.spec.ts
git commit -m "test(browserbase): add failing test for getScreenshotRedirectUrl"
```

---

## Task 5: Implement `getScreenshotRedirectUrl` service method

**Files:**
- Modify: `apps/api/src/browserbase/browserbase.service.ts` (add method after `getPresignedUrl` at line 865)

- [ ] **Step 1: Add `NotFoundException` to the imports**

Old (line 1):
```typescript
import { Injectable, Logger } from '@nestjs/common';
```

New:
```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
```

- [ ] **Step 2: Add the method**

Insert after the existing `getPresignedUrl` method (around line 865), before `getRunWithPresignedUrl`:

```typescript
  /**
   * Resolve a run's S3 screenshot key to a freshly signed presigned URL,
   * scoped to the caller's organization. Used by the controller's
   * GET runs/:runId/screenshot redirect endpoint so that the "Open full size"
   * UI link never serves an expired URL.
   */
  async getScreenshotRedirectUrl(input: {
    runId: string;
    organizationId: string;
  }): Promise<string> {
    const { runId, organizationId } = input;

    const run = await db.browserAutomationRun.findUnique({
      where: { id: runId },
      include: { automation: { include: { task: true } } },
    });

    if (!run || !run.screenshotUrl) {
      throw new NotFoundException('Screenshot not found');
    }

    if (run.automation.task.organizationId !== organizationId) {
      throw new NotFoundException('Screenshot not found');
    }

    return this.getPresignedUrl(run.screenshotUrl);
  }
```

- [ ] **Step 3: Verify the tests pass**

Run: `cd apps/api && npx jest src/browserbase/browserbase.service`
Expected: **PASS** — all 4 tests green.

- [ ] **Step 4: Typecheck**

Run: `npx turbo run typecheck --filter=@trycompai/api`
Expected: **No errors.**

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/browserbase/browserbase.service.ts
git commit -m "feat(browserbase): add getScreenshotRedirectUrl with org scope"
```

---

## Task 6: Write failing test for the redirect endpoint

**Files:**
- Create: `apps/api/src/browserbase/browserbase.controller.spec.ts`

- [ ] **Step 1: Create the controller spec**

```typescript
// apps/api/src/browserbase/browserbase.controller.spec.ts
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { BrowserbaseController } from './browserbase.controller';
import { BrowserbaseService } from './browserbase.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';

describe('BrowserbaseController.redirectToScreenshot', () => {
  let controller: BrowserbaseController;
  let service: jest.Mocked<Pick<BrowserbaseService, 'getScreenshotRedirectUrl'>>;

  beforeEach(async () => {
    service = {
      getScreenshotRedirectUrl: jest.fn(),
    } as jest.Mocked<Pick<BrowserbaseService, 'getScreenshotRedirectUrl'>>;

    const moduleRef = await Test.createTestingModule({
      controllers: [BrowserbaseController],
      providers: [{ provide: BrowserbaseService, useValue: service }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(BrowserbaseController);
  });

  const makeRes = () => {
    const res: Partial<Response> = { redirect: jest.fn() };
    return res as Response & { redirect: jest.Mock };
  };

  it('302-redirects to the freshly minted presigned URL', async () => {
    service.getScreenshotRedirectUrl.mockResolvedValue(
      'https://s3.example.com/fresh-signed',
    );
    const res = makeRes();

    await controller.redirectToScreenshot('bar_1', 'org_1', res);

    expect(service.getScreenshotRedirectUrl).toHaveBeenCalledWith({
      runId: 'bar_1',
      organizationId: 'org_1',
    });
    expect(res.redirect).toHaveBeenCalledWith(302, 'https://s3.example.com/fresh-signed');
  });

  it('propagates NotFoundException when the service throws', async () => {
    service.getScreenshotRedirectUrl.mockRejectedValue(
      new NotFoundException('Screenshot not found'),
    );
    const res = makeRes();

    await expect(
      controller.redirectToScreenshot('bar_missing', 'org_1', res),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd apps/api && npx jest src/browserbase/browserbase.controller`
Expected: **FAIL** — `controller.redirectToScreenshot is not a function`.

- [ ] **Step 3: Commit the failing test**

```bash
git add apps/api/src/browserbase/browserbase.controller.spec.ts
git commit -m "test(browserbase): add failing test for screenshot redirect endpoint"
```

---

## Task 7: Implement the redirect endpoint

**Files:**
- Modify: `apps/api/src/browserbase/browserbase.controller.ts`

- [ ] **Step 1: Expand the imports from `@nestjs/common`**

Old (lines 1-10):
```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
```

New:
```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
```

- [ ] **Step 2: Add the endpoint at the end of the controller (after `getRunById`)**

Insert just before the closing `}` of the class:

```typescript
  @Get('runs/:runId/screenshot')
  @RequirePermission('task', 'read')
  @ApiOperation({
    summary: 'Redirect to a freshly signed screenshot URL',
    description:
      'Issues a 302 redirect to a newly signed S3 URL so that "Open full size" links never serve an expired URL.',
  })
  @ApiParam({ name: 'runId', description: 'Run ID' })
  @ApiResponse({ status: 302, description: 'Redirect to signed S3 URL' })
  @ApiResponse({ status: 404, description: 'Run or screenshot not found' })
  async redirectToScreenshot(
    @Param('runId') runId: string,
    @OrganizationId() organizationId: string,
    @Res() res: Response,
  ): Promise<void> {
    const url = await this.browserbaseService.getScreenshotRedirectUrl({
      runId,
      organizationId,
    });
    res.redirect(302, url);
  }
```

- [ ] **Step 3: Verify the tests pass**

Run: `cd apps/api && npx jest src/browserbase/browserbase.controller`
Expected: **PASS** — both tests green.

- [ ] **Step 4: Typecheck**

Run: `npx turbo run typecheck --filter=@trycompai/api`
Expected: **No errors.**

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/browserbase/browserbase.controller.ts
git commit -m "feat(browserbase): add GET runs/:runId/screenshot redirect endpoint"
```

---

## Task 8: Write failing tests for RunItem anchor behavior

**Files:**
- Create: `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/RunItem.test.tsx`

- [ ] **Step 1: Create the vitest spec**

```tsx
// apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/RunItem.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RunItem } from './RunItem';
import type { BrowserAutomationRun } from '../../hooks/types';

const baseRun: BrowserAutomationRun = {
  id: 'bar_123',
  status: 'completed',
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  screenshotUrl: 'https://s3.example.com/signed?sig=abc',
  evaluationStatus: 'pass',
  evaluationReason: 'All good',
  error: null,
} as unknown as BrowserAutomationRun;

describe('RunItem', () => {
  it('Open full size anchor points at the stable redirect endpoint, not the signed URL', () => {
    render(<RunItem run={baseRun} isLatest={true} />);
    const link = screen.getByRole('link', { name: /open full size/i });
    expect(link.getAttribute('href')).toContain(
      '/v1/browserbase/runs/bar_123/screenshot',
    );
    expect(link.getAttribute('href')).not.toContain('s3.example.com');
  });

  it('Try direct link fallback also points at the stable redirect endpoint', () => {
    render(<RunItem run={baseRun} isLatest={true} />);
    // Force image error state by firing onError on the <Image>
    const img = screen.getByAltText('Automation screenshot');
    fireEvent.error(img);
    const fallback = screen.getByRole('link', { name: /try direct link/i });
    expect(fallback.getAttribute('href')).toContain(
      '/v1/browserbase/runs/bar_123/screenshot',
    );
  });

  it('renders the inline thumbnail using the presigned URL from the run payload', () => {
    render(<RunItem run={baseRun} isLatest={true} />);
    const img = screen.getByAltText('Automation screenshot') as HTMLImageElement;
    expect(img.src).toContain('s3.example.com');
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `cd apps/app && npx vitest run src/app/\\(app\\)/\\[orgId\\]/tasks/\\[taskId\\]/components/browser-automations/RunItem.test.tsx`
Expected: **FAIL** — "Open full size" currently points at the S3 URL.

- [ ] **Step 3: Commit the failing test**

```bash
git add "apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/RunItem.test.tsx"
git commit -m "test(run-item): add failing test for stable full-size screenshot URL"
```

---

## Task 9: Update `RunItem` to use the stable redirect URL

**Files:**
- Modify: `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/RunItem.tsx`

- [ ] **Step 1: Derive the stable URL near the top of the component**

Old (lines 16-25):
```tsx
export function RunItem({ run, isLatest }: RunItemProps) {
  const [expanded, setExpanded] = useState(isLatest);
  const [imageError, setImageError] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(run.createdAt), { addSuffix: true });
  const hasFailed = run.status === 'failed';
  const isCompleted = run.status === 'completed';
  const hasScreenshot = !!run.screenshotUrl;
  const evaluationPassed = run.evaluationStatus === 'pass';
  const evaluationFailed = run.evaluationStatus === 'fail';
```

New:
```tsx
export function RunItem({ run, isLatest }: RunItemProps) {
  const [expanded, setExpanded] = useState(isLatest);
  const [imageError, setImageError] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(run.createdAt), { addSuffix: true });
  const hasFailed = run.status === 'failed';
  const isCompleted = run.status === 'completed';
  const hasScreenshot = !!run.screenshotUrl;
  const evaluationPassed = run.evaluationStatus === 'pass';
  const evaluationFailed = run.evaluationStatus === 'fail';

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
  const fullSizeHref = `${apiBase}/v1/browserbase/runs/${run.id}/screenshot`;
```

- [ ] **Step 2: Swap the "Open full size" anchor's href**

Old (line 143):
```tsx
                  <a
                    href={run.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open full size
```

New:
```tsx
                  <a
                    href={fullSizeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open full size
```

- [ ] **Step 3: Swap the "Try direct link" fallback anchor's href**

Old (line 172):
```tsx
                <a
                  href={run.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  Try direct link
```

New:
```tsx
                <a
                  href={fullSizeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  Try direct link
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `cd apps/app && npx vitest run src/app/\\(app\\)/\\[orgId\\]/tasks/\\[taskId\\]/components/browser-automations/RunItem.test.tsx`
Expected: **PASS** — all 3 tests green.

- [ ] **Step 5: Typecheck the app**

Run: `npx turbo run typecheck --filter=@trycompai/app`
Expected: **No errors.**

- [ ] **Step 6: Run the design-system audit skill**

Per `CLAUDE.md`, after any frontend edit run the `audit-design-system` skill on the modified file. If it flags `lucide-react` imports or legacy `@trycompai/ui` usage, migrate them in a follow-up task (do NOT expand scope here — only migrate icons/components that were part of the edited lines).

- [ ] **Step 7: Commit**

```bash
git add "apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/RunItem.tsx"
git commit -m "fix(run-item): point full-size link at stable redirect endpoint"
```

---

## Task 10: Investigate the evaluation error state

**Files:**
- Read-only exploration. Update `apps/api/src/browserbase/browserbase.service.ts` as dictated by findings.

Context: the ticket screenshot shows an `Evaluation Failed` state with an error message. Looking at the current code paths:

- `runBrowserAutomation` / `executeAutomationOnSession` set `evaluationStatus: result.evaluationStatus`, but `executeAutomation` never populates `evaluationStatus` on its return value (only `evaluationReason`). That means the UI's "Pass"/"Fail" badge is sourced from a field that is never set to `fail` by the current code — so the "evaluation error" in the ticket is almost certainly the raw error message shown in RunItem's error pane (`run.error`), not a proper evaluation-fail signal.

- Candidates for the error surface:
  - `authCheck.isLoggedIn === false` → `error: 'Session expired. Please re-authenticate in browser settings.'`
  - `isNoPage` catch → `error: 'Browser session ended before we could capture evidence. Please retry.'`
  - Generic catch → raw `err.message` (often a stack-ish Stagehand/Browserbase error)

- [ ] **Step 1: Grep for every assignment to `evaluationStatus`, `evaluationReason`, and `run.error`**

Run these and record findings:
```bash
rg -n "evaluationStatus\s*:" apps/api/src/browserbase
rg -n "evaluationReason\s*:" apps/api/src/browserbase
rg -n "error\s*:\s*(err|result\.error)" apps/api/src/browserbase
rg -n "await stagehand\." apps/api/src/browserbase/browserbase.service.ts
```

- [ ] **Step 2: Reproduce locally**

Start the API and app (if the user has local browserbase/anthropic credentials available; otherwise trigger a run against a URL that is likely to fail auth or timeout, e.g. a URL that redirects to login).

```bash
npx turbo run dev --filter=@trycompai/api &
npx turbo run dev --filter=@trycompai/app &
```

Trigger an automation from the UI and watch the run land in `failed` status.

- [ ] **Step 3: Narrow the user-facing error surface**

In `executeAutomation`'s generic catch (currently ~line 818-831), the branch that does not match `isNoPage` returns `error: message` — where `message` is the raw thrown-error message. Wrap that with a stable, user-readable message while preserving the raw details in the service logger:

Old:
```typescript
    } catch (err) {
      this.logger.error('Failed to execute automation', err);
      const message = err instanceof Error ? err.message : String(err);
      const isNoPage =
        message.includes('awaitActivePage') ||
        message.includes('no page available') ||
        message.includes('No page found');
      return {
        success: false,
        needsReauth: isNoPage ? true : undefined,
        error: isNoPage
          ? 'Browser session ended before we could capture evidence. Please retry.'
          : message,
      };
    }
```

New:
```typescript
    } catch (err) {
      this.logger.error('Failed to execute automation', err);
      const message = err instanceof Error ? err.message : String(err);
      const isNoPage =
        message.includes('awaitActivePage') ||
        message.includes('no page available') ||
        message.includes('No page found');
      const isTimeout =
        message.includes('timeout') ||
        message.includes('Timeout') ||
        message.includes('timed out');

      const userFacing = isNoPage
        ? 'Browser session ended before we could capture evidence. Please retry.'
        : isTimeout
          ? 'Automation timed out before completing. Please retry — if this keeps happening, simplify the instruction or check the target site.'
          : 'Automation failed to complete. Please retry — see run error details for specifics.';

      return {
        success: false,
        needsReauth: isNoPage ? true : undefined,
        error: userFacing,
      };
    }
```

- [ ] **Step 4: Typecheck + run all browserbase tests**

Run:
```bash
npx turbo run typecheck --filter=@trycompai/api
cd apps/api && npx jest src/browserbase
```
Expected: **PASS.**

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/browserbase/browserbase.service.ts
git commit -m "fix(browserbase): surface user-readable error for timeouts and generic failures"
```

---

## Task 11: Final verification

**Files:** none — this is a verification-only task.

- [ ] **Step 1: Full typecheck across the monorepo**

Run:
```bash
npx turbo run typecheck --filter=@trycompai/api --filter=@trycompai/app
```
Expected: **No errors.**

- [ ] **Step 2: Full test sweep**

Run:
```bash
cd apps/api && npx jest src/browserbase
cd ../../apps/app && npx vitest run src/app/\\(app\\)/\\[orgId\\]/tasks/\\[taskId\\]/components/browser-automations
```
Expected: **All green.**

- [ ] **Step 3: Lint the touched packages**

Run: `bun run lint`
Expected: **No errors.**

- [ ] **Step 4: Build the affected packages**

Run: `bun run --filter '@trycompai/api' build && bun run --filter '@trycompai/app' build`
Expected: **Both succeed.**

- [ ] **Step 5: Smoke test the redirect endpoint**

With the dev API running:
```bash
curl -I -b "<session-cookie>" http://localhost:3333/v1/browserbase/runs/<a-real-run-id>/screenshot
```
Expected: `HTTP/1.1 302 Found` with a `Location: https://...amazonaws.com/...` header.

- [ ] **Step 6: Ask the user before pushing**

Per workflow preferences in memory, do NOT `git push` without explicit user confirmation. Report completion, summarize what shipped, and ask whether to push and open a PR.
