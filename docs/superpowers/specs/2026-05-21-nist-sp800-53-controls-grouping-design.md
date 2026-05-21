# NIST SP800-53 Controls Grouping Design

Covers Linear tickets CS-389, CS-390, CS-391, CS-392, CS-393.

## Problem

Large frameworks like NIST SP800-53 have 1200+ controls. The current flat table in `FrameworkControls.tsx` is unusable at that scale — users can't navigate, group, or collapse controls by family.

## Data Layer

### Schema Change

Add one nullable column to `FrameworkEditorControlTemplate`:

```prisma
model FrameworkEditorControlTemplate {
  controlFamily String?
  // ... existing fields unchanged
}
```

No changes to `Control`. Read via `control.controlTemplate.controlFamily` through the existing `controlTemplateId` FK.

**Why no field on `Control`?** Every framework-instantiated control already has `controlTemplateId`. Reading through the relation avoids backfill, sync, and version-publish concerns — platform admins set the family once on the template, and all orgs see the grouping immediately.

### Migration

Single `ALTER TABLE ADD COLUMN ... NULL` — no data migration needed.

## API Changes

### Framework Editor API

- `CreateControlTemplateDto`: add optional `controlFamily: string`
- `UpdateControlTemplateDto`: add optional `controlFamily: string`
- No new endpoints. Existing `POST` and `PATCH` on `/v1/framework-editor/control-template` handle it.

### Controls Fetch

When fetching controls for framework views, include the template relation:

```typescript
controlTemplate: { select: { controlFamily: true } }
```

This applies to the controls include in `frameworks.service.ts` (or wherever the framework-with-controls query is built). The `FrameworkInstanceWithControls` type gains `controlTemplate?: { controlFamily: string | null }` on each control.

## Framework Editor UI

Add a `controlFamily` text input to `ControlsClientPage.tsx` in `apps/framework-editor/`. Simple text field alongside existing name/description fields. Value like `"AC - Access Control"`.

## Frontend — Controls View

### Component Structure

```
FrameworkDetailContent.tsx (existing parent)
├── FrameworkControls.tsx (existing flat list — unchanged, used when no families)
├── FrameworkControlsGrouped.tsx (NEW — grouped/collapsible view)
└── framework-controls-shared.ts (NEW — extracted shared helpers)
```

**Switching logic** in `FrameworkDetailContent`: if any control has `controlTemplate?.controlFamily`, render `FrameworkControlsGrouped`. Otherwise render `FrameworkControls`.

### Shared Helpers (`framework-controls-shared.ts`)

Extracted from `FrameworkControls.tsx` so both views reuse them:

- `getStatusBadge(status)` → badge label + variant
- `RequirementCell` component
- Compliance bar rendering
- `ControlItem` type definition
- `buildControlItems()` — maps raw controls to `ControlItem[]` with resolved requirements

### `FrameworkControlsGrouped.tsx` (CS-389, CS-390, CS-391, CS-392)

#### Grouping

- Group controls by `control.controlTemplate?.controlFamily`
- Controls without a family → "Other" section at the bottom
- Groups sorted alphabetically by family name

#### Default View (CS-391)

- All families collapsed on mount
- Each family row shows: chevron icon, family name (e.g., "AC - Access Control"), control count
- Expansion state is session-only — not persisted across page loads or navigation

#### Expand/Collapse (CS-389)

- Chevron icon on each family row toggles expanded/collapsed
- Multiple families can be open simultaneously
- Expanded controls are visually indented under the family header
- Standard control-level actions (click to navigate to control detail) work on expanded rows
- Keyboard accessible: family rows focusable, Enter/Space toggles

#### Sort Within Families (CS-390)

- Controls within each family sorted by name (contains identifier: "AC-1", "AC-2", etc.)
- This gives natural identifier ordering since names start with the identifier

#### Expand All / Collapse All (CS-392)

- Toggle button in the toolbar (above the table, near search)
- When all are collapsed → button shows expand-all icon/label
- When any are expanded → button collapses all

#### Search (CS-391)

- Searching filters controls across all families
- Families that contain matching controls auto-expand
- Families with no matches are hidden
- Clearing search restores previous expand/collapse state

#### Table Columns (within expanded families)

Same as current `FrameworkControls.tsx`:

| Name | Requirement | Compliance | Status | Policies | Tasks | Documents |

Family header rows span all columns.

### Pagination

- Pagination applies to the family list, not individual controls
- All controls within an expanded family are shown (no nested pagination)

## CS-393 — Remove Duplicate "Requirements (N)"

In `SingleControl.tsx`, the Requirements tab trigger shows `"Requirements (N)"`. Inside the tab body, there's a redundant heading repeating the same text. Remove the heading inside the tab body to reclaim screen real estate.

**File**: `apps/app/src/app/(app)/[orgId]/controls/[controlId]/components/SingleControl.tsx`

## Files to Create/Modify

### New Files
- `apps/app/src/app/(app)/[orgId]/frameworks/[frameworkInstanceId]/components/FrameworkControlsGrouped.tsx`
- `apps/app/src/app/(app)/[orgId]/frameworks/[frameworkInstanceId]/components/framework-controls-shared.ts`

### Modified Files
- `packages/db/prisma/schema/framework-editor.prisma` — add `controlFamily` column
- `apps/api/src/framework-editor/control-template/dto/create-control-template.dto.ts` — add field
- `apps/api/src/framework-editor/control-template/dto/update-control-template.dto.ts` — add field
- `apps/api/src/frameworks/frameworks.service.ts` — include `controlTemplate.controlFamily` in controls fetch
- `apps/framework-editor/app/components/editor/ControlsClientPage.tsx` — add controlFamily input
- `apps/app/src/app/(app)/[orgId]/frameworks/[frameworkInstanceId]/components/FrameworkDetailContent.tsx` — switch between flat/grouped
- `apps/app/src/app/(app)/[orgId]/frameworks/[frameworkInstanceId]/components/FrameworkControls.tsx` — extract shared helpers
- `apps/app/src/app/(app)/[orgId]/controls/[controlId]/components/SingleControl.tsx` — remove duplicate heading
- `apps/app/src/lib/types/framework.ts` — extend type to include `controlTemplate`

## Out of Scope

- Persisting expand/collapse state across sessions
- Column-level sorting (sort by status, compliance, etc.) within families
- Control family management UI (rename, merge families) — families are just strings
- Adding control families to the global `/controls` page (only framework views)
