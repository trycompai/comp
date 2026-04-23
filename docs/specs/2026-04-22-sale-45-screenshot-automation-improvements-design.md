# SALE-45 — Screenshot Automation Improvements

**Ticket**: https://linear.app/compai/issue/SALE-45
**Date**: 2026-04-22
**Branch**: `mariano/sale-45-screenshot-automation-feature-improvements`

## Goals

Three independent fixes to the browser-automation screenshot feature:

1. **Audit overlay baked into the image** — timestamp, source URL, auditor requirement burned into the PNG/JPEG so a screenshot retains its provenance when downloaded, exported, or pasted into an audit report.
2. **Repair "Access denied" when opening the full-size screenshot** — the presigned URL embedded in the run payload is stale by the time a reviewer clicks "Open full size".
3. **Diagnose and repair the "evaluation error" state** surfaced in the UI.

All three ship in the same branch and the same PR; they touch the same module and the audit team is waiting on the full set.

## Non-goals

- Swapping the screenshot transport from `page.screenshot()` to CDP `Page.captureScreenshot` (a latent nice-to-have, not part of this ticket).
- Changing Browserbase session lifecycle, Stagehand model, or eval prompt architecture.
- Redesigning `RunItem.tsx` layout beyond the minimum to hook into the new URL flow.

## Architecture

### Backend — capture, composite, upload

**File**: `apps/api/src/browserbase/browserbase.service.ts` (currently 918 lines — creation of a new helper module is required to stay under the 300-line rule).

New module: `apps/api/src/browserbase/screenshot-overlay.ts`

```
renderOverlay({ buffer, instruction, sourceUrl, capturedAt }): Promise<Buffer>
```

Uses `sharp` (already in `package.json`) to:

1. Decode the incoming JPEG buffer, read its width/height.
2. Render an overlay strip (SVG → PNG via `sharp.composite`) that sits on the **bottom** of the screenshot, increasing the image height by ~88px.
3. Banner content (three rows, ~12–13px text, dark `#0A0A0A` background, white text, left-aligned):
   - **Row 1** (bold): `Auditor requirement: <instruction>` — truncated with ellipsis at ~120 chars
   - **Row 2**: `Captured: 2026-04-22 14:32:07 UTC`
   - **Row 3**: `Source: https://final.page.url/after/redirects`
4. Re-encode as JPEG @ quality 85 and return.

Integration point: `executeAutomation` at line ~805 already has a post-capture buffer. After the existing `page.screenshot()`, call `renderOverlay()` against the decoded buffer using:

- `instruction` — from the `BrowserAutomation.instruction` field already available in the run context
- `sourceUrl` — `await page.url()` captured just before `page.screenshot()` (reflects the post-navigation URL, not just the requested `targetUrl`)
- `capturedAt` — `new Date()` in UTC, formatted `yyyy-MM-dd HH:mm:ss 'UTC'` via `date-fns-tz`

Upload path is unchanged (`uploadScreenshot` at line 837) — the overlaid buffer just flows through as before.

### Backend — fresh-URL redirect endpoint

New controller endpoint in `apps/api/src/browserbase/browserbase.controller.ts`:

```
GET /v1/browser-automations/runs/:runId/screenshot
  → 302 redirect to a freshly minted presigned URL (TTL 1h)
```

- Guards: `@UseGuards(HybridAuthGuard, PermissionGuard)` + `@RequirePermission('task', 'read')` (screenshots are scoped to tasks, reuse the existing task:read permission to keep auditors/admins/etc. aligned with who can already see runs)
- Service method: `BrowserbaseService.getScreenshotRedirectUrl(runId, organizationId)` — loads the run, scopes to org, verifies `screenshotUrl` (key) is present, mints fresh presigned URL, returns the URL string. Controller issues the redirect with `@Res()` + `res.redirect(302, url)`.
- 404 if run doesn't exist / doesn't belong to org; 404 if no screenshot yet (so a link never dangles).

The existing `getAutomationsWithPresignedUrls` keeps inlining a presigned URL for the preview `<Image>` thumbnail (needed for the inline thumbnail to render without a second round-trip). The **full-size link** switches to the stable redirect URL.

### Frontend — stable "Open full size" link

**File**: `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/RunItem.tsx`

Change the `Open full size` anchor's `href` from `run.screenshotUrl` (presigned, ages out) to the stable redirect URL:

```
/api/v1/browser-automations/runs/{run.id}/screenshot
```

Use `apiClient.buildUrl()` or the existing helper so it resolves correctly across environments (cross-subdomain cookie flow handles auth). The inline `<Image>` preview keeps using `run.screenshotUrl` for now (it renders while the page is still fresh; if it fails, the existing `imageError` fallback already shows a "Try direct link" fallback that we'll also switch to the redirect URL).

### Evaluation error — investigation + fix

The error in the ticket screenshot shows a failed evaluation state in RunItem's error pane. Root cause is currently unknown — needs repro before the fix. Plan:

1. Enumerate all code paths that set `BrowserAutomationRun.error` and `evaluationStatus = fail` (service.ts + any queue consumer).
2. Reproduce by running a known-working automation against a stable URL; if it doesn't fail, reproduce with the URL from the ticket if available, or with a URL that triggers a consent wall.
3. The likely candidates are:
   - Stagehand extract timing out → shows up as evaluation error with a long stack
   - Browserbase session expiring mid-run → already has handling (`isNoPage`), but may not classify correctly
   - `page.screenshot()` throwing when the page closed between navigation and capture
4. Once reproduced, fix at the source and surface a short, user-readable reason on `evaluationReason` rather than raw stack text. Leave the full error on `run.error` for debugging.

This task is scoped as "investigate + minimal fix + user-facing-message cleanup". If the investigation reveals a larger architectural issue (e.g., needs a queue-retry policy), it gets its own ticket — we don't expand scope here.

## Data model

No schema changes. Existing fields are sufficient:

- `BrowserAutomationRun.screenshotUrl` — S3 key (unchanged)
- `BrowserAutomationRun.evaluationStatus`, `evaluationReason`, `error` — already in use

## Error handling

- **Overlay rendering failure** (malformed source image, sharp throws): log the error, upload the original un-overlaid buffer rather than failing the entire run. An audit screenshot without an overlay is strictly better than no screenshot at all.
- **Presigned URL redirect 404**: returned when run is missing, not in the caller's org, or has no screenshot key. The `<a>` falls back to the existing `imageError` branch in `RunItem.tsx`.
- **Overlay adds too much height**: clamp banner to a fixed 88px regardless of source image width; long instruction text is truncated with ellipsis. Tests include a 4000px-wide and a 400px-wide image.

## Testing

All new behavior is unit-tested per the project rule "Every new feature MUST include tests".

- **API (Jest)** — `apps/api/src/browserbase/`
  - `screenshot-overlay.spec.ts` — asserts output image is a valid JPEG, height equals `source.height + 88`, overlay bytes present by sampling pixels in the banner region, truncation of long instruction text, handling of unicode/URL-encoded source URLs.
  - `browserbase.controller.spec.ts` — new redirect endpoint: 302 with fresh URL for authorized caller, 404 for cross-org run, 404 for run without screenshot, 401 for unauthenticated.
  - `browserbase.service.spec.ts` — `getScreenshotRedirectUrl` happy path + cross-org scope check.
- **App (Vitest)** — `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/`
  - `RunItem.test.tsx` — "Open full size" anchor points at `/api/v1/.../screenshot`, not a signed S3 URL. "Try direct link" fallback also points at the redirect URL. Inline `<Image>` still uses presigned preview URL.

## Rollout

- Deploy API + app together. The redirect endpoint is new — if only the app deploys first, the old presigned URL keeps working (worst case: another hour of the old stale-URL bug). If only the API deploys first, the endpoint is unused.
- No feature flag needed; this is strictly additive on the backend and the frontend change is a one-line `href` swap.
- No data migration needed.

## Out of scope (explicit)

- Changing eval prompt / eval model
- Switching to CDP screenshots
- Adding a user-settable "overlay preset" (single banner style for v1 — parametrize later if requested)
- Bumping the inline-thumbnail URL TTL (current 1h is fine because the thumbnail is rendered immediately after fetch)
