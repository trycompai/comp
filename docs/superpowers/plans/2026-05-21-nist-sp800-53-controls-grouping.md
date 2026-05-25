# NIST SP800-53 Controls Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add control family grouping with expand/collapse to the framework controls view so large frameworks (1200+ controls) are navigable.

**Architecture:** Add `controlFamily` to `FrameworkEditorControlTemplate` (read through existing FK, no field on `Control`). Build a new `FrameworkControlsGrouped` component that renders collapsible family sections. The parent switches between flat/grouped view based on whether controls have family data.

**Tech Stack:** Prisma, NestJS, Next.js, React, @trycompai/design-system

**Working directory:** `/Users/mariano/code/comp/.worktrees/nist-sp800-53-readiness`

---

### Task 1: Schema Migration

**Files:**
- Modify: `packages/db/prisma/schema/framework-editor.prisma:91-110`

- [ ] **Step 1: Add `controlFamily` field to schema**

In `packages/db/prisma/schema/framework-editor.prisma`, add the field after `description`:

```prisma
model FrameworkEditorControlTemplate {
  id            String  @id @default(dbgenerated("generate_prefixed_cuid('frk_ct'::text)"))
  name          String
  description   String
  controlFamily String?

  policyTemplates        FrameworkEditorPolicyTemplate[]
  requirements           FrameworkEditorRequirement[]
  taskTemplates          FrameworkEditorTaskTemplate[]
  documentTypes          EvidenceFormType[]
  frameworkPolicyLinks   FrameworkEditorControlPolicyTemplateLink[]
  frameworkTaskLinks     FrameworkEditorControlTaskTemplateLink[]
  frameworkDocumentLinks FrameworkEditorControlDocumentTypeLink[]

  // Dates
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  // Instances
  controls Control[]
}
```

- [ ] **Step 2: Generate and run migration**

```bash
cd packages/db && DATABASE_URL="postgresql://postgres:postgres@localhost:5432/compdev_nist_sp800_53_readiness" bunx prisma migrate dev --name add_control_family
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd packages/db && DATABASE_URL="postgresql://postgres:postgres@localhost:5432/compdev_nist_sp800_53_readiness" bunx prisma generate
```

- [ ] **Step 4: Verify typecheck**

```bash
npx turbo run typecheck --filter=@trycompai/db
```

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/schema/framework-editor.prisma packages/db/prisma/migrations/
git commit -m "feat(db): add controlFamily to FrameworkEditorControlTemplate"
```

---

### Task 2: API — DTOs and Service

**Files:**
- Modify: `apps/api/src/framework-editor/control-template/dto/create-control-template.dto.ts`
- Modify: `apps/api/src/framework-editor/control-template/control-template.service.ts:102-137` (create) and `:139-186` (update)

- [ ] **Step 1: Add `controlFamily` to `CreateControlTemplateDto`**

In `apps/api/src/framework-editor/control-template/dto/create-control-template.dto.ts`, add after the `description` field:

```typescript
  @ApiPropertyOptional({ example: 'AC - Access Control' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  controlFamily?: string;
```

`UpdateControlTemplateDto` inherits via `PartialType` — no changes needed there.

- [ ] **Step 2: Include `controlFamily` in service `create` method**

In `apps/api/src/framework-editor/control-template/control-template.service.ts`, update both `create` paths to include `controlFamily` in the Prisma `data` object.

Line ~105 (no documentTypes path):
```typescript
      const ct = await db.frameworkEditorControlTemplate.create({
        data: {
          name: dto.name,
          description: dto.description ?? '',
          controlFamily: dto.controlFamily ?? null,
        },
      });
```

Line ~119 (with documentTypes path):
```typescript
      const created = await tx.frameworkEditorControlTemplate.create({
        data: {
          name: dto.name,
          description: dto.description ?? '',
          controlFamily: dto.controlFamily ?? null,
        },
      });
```

- [ ] **Step 3: Include `controlFamily` in service `update` method**

In the `update` method, the no-documentTypes path (line ~141) does a direct `db.frameworkEditorControlTemplate.update`. Since the DTO uses `PartialType`, Prisma's update already handles partial fields. But verify the data spread includes `controlFamily`. The current code at line ~141:

```typescript
  async update(id: string, dto: UpdateControlTemplateDto) {
    if (dto.documentTypes === undefined) {
      return db.frameworkEditorControlTemplate.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.controlFamily !== undefined && { controlFamily: dto.controlFamily }),
        },
      });
    }
```

Check the existing update code — if it already spreads all DTO fields, `controlFamily` flows automatically. If it uses explicit field mapping (like above), add the `controlFamily` line. Also update the transaction path similarly.

- [ ] **Step 4: Verify typecheck**

```bash
npx turbo run typecheck --filter=@trycompai/api
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/framework-editor/control-template/
git commit -m "feat(api): add controlFamily to control template DTOs and service"
```

---

### Task 3: API — Include `controlFamily` in Framework Controls Fetch

**Files:**
- Modify: `apps/api/src/frameworks/frameworks.service.ts:272-289` (findOne control include)

- [ ] **Step 1: Add `controlTemplate` to the control include in `findOne`**

In `apps/api/src/frameworks/frameworks.service.ts`, inside the `findOne` method's Prisma query (line ~272), the `control` include currently has `frameworkPolicyLinks`, `requirementsMapped`, and `frameworkDocumentLinks`. Add `controlTemplate`:

```typescript
      control: {
        include: {
          controlTemplate: {
            select: { controlFamily: true },
          },
          frameworkPolicyLinks: {
            where: {
              frameworkInstanceId,
              policy: { archivedAt: null },
            },
            include: {
              policy: {
                select: { id: true, name: true, status: true },
              },
            },
          },
          requirementsMapped: { where: { archivedAt: null } },
          frameworkDocumentLinks: {
            where: { frameworkInstanceId },
          },
        },
      },
```

- [ ] **Step 2: Pass `controlTemplate` through the transformation**

In the same file, the transformation at lines ~303-325 destructures `rm.control` and spreads `controlData`. The `controlTemplate` field will be included in `controlData` automatically since it's not destructured out. Verify this by checking the destructure:

```typescript
        const {
          requirementsMapped: _,
          frameworkPolicyLinks,
          frameworkDocumentLinks,
          ...controlData  // controlTemplate is included here
        } = rm.control;
```

If `controlTemplate` is not being destructured out, it flows through. No code change needed for the transformation.

- [ ] **Step 3: Verify typecheck**

```bash
npx turbo run typecheck --filter=@trycompai/api
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/frameworks/frameworks.service.ts
git commit -m "feat(api): include controlTemplate.controlFamily in framework controls fetch"
```

---

### Task 4: Frontend Type Update

**Files:**
- Modify: `apps/app/src/lib/types/framework.ts`

- [ ] **Step 1: Add `controlTemplate` to `FrameworkInstanceWithControls`**

```typescript
import type {
  Control,
  CustomFramework,
  FrameworkEditorFramework,
  FrameworkInstance,
  PolicyStatus,
  RequirementMap,
} from '@db';

export type FrameworkInstanceWithControls = FrameworkInstance & {
  framework: FrameworkEditorFramework | null;
  customFramework: CustomFramework | null;
  controls: (Control & {
    policies: Array<{
      id: string;
      name: string;
      status: PolicyStatus;
    }>;
    requirementsMapped: RequirementMap[];
    controlDocumentTypes?: Array<{
      formType: string;
      isNotRelevant?: boolean;
    }>;
    controlTemplate?: {
      controlFamily: string | null;
    };
  })[];
};

export interface FrameworkInstanceWithComplianceScore {
  frameworkInstance: FrameworkInstanceWithControls;
  complianceScore: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/lib/types/framework.ts
git commit -m "feat(app): add controlTemplate to FrameworkInstanceWithControls type"
```

---

### Task 5: Extract Shared Helpers from `FrameworkControls.tsx`

**Files:**
- Create: `apps/app/src/app/(app)/[orgId]/frameworks/[frameworkInstanceId]/components/framework-controls-shared.ts`
- Modify: `apps/app/src/app/(app)/[orgId]/frameworks/[frameworkInstanceId]/components/FrameworkControls.tsx`

- [ ] **Step 1: Create `framework-controls-shared.ts`**

Extract the shared types and helpers that both `FrameworkControls` and the new `FrameworkControlsGrouped` will use:

```typescript
import type { StatusType } from '@/components/status-indicator';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import type { FrameworkEditorRequirement } from '@db';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export interface ControlItem {
  control: FrameworkInstanceWithControls['controls'][number];
  requirements: Array<{ id: string; name: string; identifier: string }>;
}

export function getStatusBadge(status: StatusType): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive';
} {
  switch (status) {
    case 'completed':
      return { label: 'Satisfied', variant: 'default' };
    case 'in_progress':
      return { label: 'In Progress', variant: 'secondary' };
    case 'not_relevant':
      return { label: 'Not Relevant', variant: 'secondary' };
    default:
      return { label: 'Not Started', variant: 'destructive' };
  }
}

export function buildRequirementMap(
  requirementDefinitions: FrameworkEditorRequirement[],
): Map<string, { id: string; name: string; identifier: string }> {
  const map = new Map<string, { id: string; name: string; identifier: string }>();
  for (const req of requirementDefinitions) {
    map.set(req.id, { id: req.id, name: req.name, identifier: req.identifier ?? '' });
  }
  return map;
}

export function buildControlItems(
  controls: FrameworkInstanceWithControls['controls'],
  requirementMap: Map<string, { id: string; name: string; identifier: string }>,
): ControlItem[] {
  return controls.map((control) => {
    const requirements = (control.requirementsMapped ?? [])
      .map((rm) => (rm.requirementId ? requirementMap.get(rm.requirementId) : undefined))
      .filter((r): r is { id: string; name: string; identifier: string } => r != null);
    return { control, requirements };
  });
}
```

- [ ] **Step 2: Update `FrameworkControls.tsx` to use shared helpers**

Replace inline definitions with imports:

```typescript
import {
  type ControlItem,
  PAGE_SIZE_OPTIONS,
  buildControlItems,
  buildRequirementMap,
  getStatusBadge,
} from './framework-controls-shared';
```

Remove the duplicated `PAGE_SIZE_OPTIONS`, `getStatusBadge`, and `ControlItem` from `FrameworkControls.tsx`. Replace the inline `requirementMap` and `items` useMemos:

```typescript
  const requirementMap = useMemo(
    () => buildRequirementMap(requirementDefinitions),
    [requirementDefinitions],
  );

  const items: ControlItem[] = useMemo(
    () => buildControlItems(frameworkInstanceWithControls.controls, requirementMap),
    [frameworkInstanceWithControls.controls, requirementMap],
  );
```

- [ ] **Step 3: Verify `FrameworkControls.tsx` still works**

```bash
npx turbo run typecheck --filter=@trycompai/app
```

- [ ] **Step 4: Commit**

```bash
git add apps/app/src/app/(app)/\[orgId\]/frameworks/\[frameworkInstanceId\]/components/framework-controls-shared.ts apps/app/src/app/(app)/\[orgId\]/frameworks/\[frameworkInstanceId\]/components/FrameworkControls.tsx
git commit -m "refactor(app): extract shared helpers from FrameworkControls"
```

---

### Task 6: Build `FrameworkControlsGrouped` Component

**Files:**
- Create: `apps/app/src/app/(app)/[orgId]/frameworks/[frameworkInstanceId]/components/FrameworkControlsGrouped.tsx`

This is the core deliverable — a grouped, collapsible controls table. It covers CS-389 (families), CS-390 (sort), CS-391 (default collapsed), CS-392 (expand all).

- [ ] **Step 1: Create the component file**

```typescript
'use client';

import type { StatusType } from '@/components/status-indicator';
import {
  type EvidenceSubmissionInfo,
  getControlProgressPercent,
  getControlStatus,
  getRequirementArtifactCounts,
} from '@/lib/control-compliance';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import type { Control, FrameworkEditorRequirement, Task } from '@db';
import {
  Badge,
  Button,
  Heading,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { ChevronDown, ChevronRight, Launch, Search } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ControlItem,
  buildControlItems,
  buildRequirementMap,
  getStatusBadge,
} from './framework-controls-shared';

const COLUMN_COUNT = 7;
const UNGROUPED_FAMILY = '__ungrouped__';

interface ControlFamily {
  name: string;
  displayName: string;
  items: ControlItem[];
}

function groupByFamily(items: ControlItem[]): ControlFamily[] {
  const familyMap = new Map<string, ControlItem[]>();

  for (const item of items) {
    const family = item.control.controlTemplate?.controlFamily ?? UNGROUPED_FAMILY;
    const existing = familyMap.get(family) ?? [];
    existing.push(item);
    familyMap.set(family, existing);
  }

  const families: ControlFamily[] = [];
  const ungrouped: ControlItem[] = [];

  for (const [name, groupItems] of familyMap) {
    if (name === UNGROUPED_FAMILY) {
      ungrouped.push(...groupItems);
      continue;
    }
    const sorted = groupItems.sort((a, b) => a.control.name.localeCompare(b.control.name));
    families.push({ name, displayName: name, items: sorted });
  }

  families.sort((a, b) => a.name.localeCompare(b.name));

  if (ungrouped.length > 0) {
    ungrouped.sort((a, b) => a.control.name.localeCompare(b.control.name));
    families.push({ name: UNGROUPED_FAMILY, displayName: 'Other', items: ungrouped });
  }

  return families;
}

export function FrameworkControlsGrouped({
  frameworkInstanceWithControls,
  requirementDefinitions,
  tasks,
  evidenceSubmissions = [],
}: {
  frameworkInstanceWithControls: FrameworkInstanceWithControls;
  requirementDefinitions: FrameworkEditorRequirement[];
  tasks: (Task & { controls: Control[] })[];
  evidenceSubmissions?: EvidenceSubmissionInfo[];
}) {
  const { orgId, frameworkInstanceId } = useParams<{
    orgId: string;
    frameworkInstanceId: string;
  }>();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  const requirementMap = useMemo(
    () => buildRequirementMap(requirementDefinitions),
    [requirementDefinitions],
  );

  const allItems = useMemo(
    () => buildControlItems(frameworkInstanceWithControls.controls, requirementMap),
    [frameworkInstanceWithControls.controls, requirementMap],
  );

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return allItems;
    const searchLower = searchTerm.toLowerCase();
    return allItems.filter(
      (item) =>
        item.control.name.toLowerCase().includes(searchLower) ||
        item.control.description?.toLowerCase().includes(searchLower) ||
        item.requirements.some(
          (r) =>
            r.name.toLowerCase().includes(searchLower) ||
            r.identifier.toLowerCase().includes(searchLower),
        ),
    );
  }, [allItems, searchTerm]);

  const families = useMemo(() => groupByFamily(filteredItems), [filteredItems]);

  // Auto-expand families when searching
  useEffect(() => {
    if (searchTerm.trim()) {
      setExpandedFamilies(new Set(families.map((f) => f.name)));
    } else {
      setExpandedFamilies(new Set());
    }
  }, [searchTerm, families]);

  const allExpanded = families.length > 0 && families.every((f) => expandedFamilies.has(f.name));

  const handleToggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedFamilies(new Set());
    } else {
      setExpandedFamilies(new Set(families.map((f) => f.name)));
    }
  }, [allExpanded, families]);

  const handleToggleFamily = useCallback((familyName: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(familyName)) {
        next.delete(familyName);
      } else {
        next.add(familyName);
      }
      return next;
    });
  }, []);

  const getControlHref = (controlId: string) =>
    `/${orgId}/frameworks/${frameworkInstanceId}/controls/${controlId}`;

  const totalControls = filteredItems.length;

  return (
    <div className="space-y-4">
      <Heading level="2">Controls ({totalControls})</Heading>
      <div className="flex items-center gap-3">
        <div className="w-full max-w-sm">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search controls..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </div>
        <Button variant="ghost" size="sm" onClick={handleToggleAll}>
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Requirement</TableHead>
            <TableHead>Compliance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Policies</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>Documents</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {families.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT}>
                <Text size="sm" variant="muted">
                  No controls found.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            families.map((family) => (
              <FamilySection
                key={family.name}
                family={family}
                expanded={expandedFamilies.has(family.name)}
                onToggle={() => handleToggleFamily(family.name)}
                getControlHref={getControlHref}
                onRowClick={(controlId) => router.push(getControlHref(controlId))}
                tasks={tasks}
                evidenceSubmissions={evidenceSubmissions}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function FamilySection({
  family,
  expanded,
  onToggle,
  getControlHref,
  onRowClick,
  tasks,
  evidenceSubmissions,
}: {
  family: ControlFamily;
  expanded: boolean;
  onToggle: () => void;
  getControlHref: (controlId: string) => string;
  onRowClick: (controlId: string) => void;
  tasks: (Task & { controls: Control[] })[];
  evidenceSubmissions: EvidenceSubmissionInfo[];
}) {
  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <>
      <TableRow
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        style={{ cursor: 'pointer' }}
        className="bg-muted/30 hover:bg-muted/50"
      >
        <TableCell colSpan={COLUMN_COUNT}>
          <div className="flex items-center gap-2 font-medium">
            <ChevronIcon size={16} />
            <span>{family.displayName}</span>
            <span className="text-muted-foreground font-normal">
              ({family.items.length})
            </span>
          </div>
        </TableCell>
      </TableRow>
      {expanded &&
        family.items.map(({ control, requirements }) => (
          <ControlRow
            key={control.id}
            control={control}
            requirements={requirements}
            getControlHref={getControlHref}
            onRowClick={onRowClick}
            tasks={tasks}
            evidenceSubmissions={evidenceSubmissions}
          />
        ))}
    </>
  );
}

function ControlRow({
  control,
  requirements,
  getControlHref,
  onRowClick,
  tasks,
  evidenceSubmissions,
}: {
  control: FrameworkInstanceWithControls['controls'][number];
  requirements: Array<{ id: string; name: string; identifier: string }>;
  getControlHref: (controlId: string) => string;
  onRowClick: (controlId: string) => void;
  tasks: (Task & { controls: Control[] })[];
  evidenceSubmissions: EvidenceSubmissionInfo[];
}) {
  const policies = control.policies ?? [];
  const documentTypes = control.controlDocumentTypes ?? [];
  const counts = getRequirementArtifactCounts([control], tasks, evidenceSubmissions);
  const status = getControlStatus(policies, tasks, control.id, documentTypes, evidenceSubmissions);
  const badge = getStatusBadge(status);
  const compliancePercent = getControlProgressPercent(
    policies,
    tasks,
    control.id,
    documentTypes,
    evidenceSubmissions,
  );

  const label = requirements.map((r) => r.identifier || r.name).join(', ');

  return (
    <TableRow onClick={() => onRowClick(control.id)} style={{ cursor: 'pointer' }}>
      <TableCell>
        <div className="pl-6">
          <Link
            href={getControlHref(control.id)}
            onClick={(e) => e.stopPropagation()}
            className="group flex items-center gap-2"
          >
            <span className="block max-w-[260px] truncate text-sm" title={control.name}>
              {control.name}
            </span>
            <Launch
              size={14}
              className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            />
          </Link>
        </div>
      </TableCell>
      <TableCell>
        {requirements.length === 0 ? (
          <Text size="sm" variant="muted">—</Text>
        ) : (
          <span className="block max-w-[200px] truncate text-sm" title={label}>{label}</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 rounded-full bg-muted/50 h-1.5">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${compliancePercent}%` }}
            />
          </div>
          <div className="tabular-nums w-10 text-right">
            <Text size="sm" variant="muted">{compliancePercent}%</Text>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </TableCell>
      <TableCell>
        <div className="tabular-nums">
          <Text size="sm" variant="muted">{counts.policies.completed}/{counts.policies.total}</Text>
        </div>
      </TableCell>
      <TableCell>
        <div className="tabular-nums">
          <Text size="sm" variant="muted">{counts.tasks.completed}/{counts.tasks.total}</Text>
        </div>
      </TableCell>
      <TableCell>
        <div className="tabular-nums">
          <Text size="sm" variant="muted">{counts.documents.completed}/{counts.documents.total}</Text>
        </div>
      </TableCell>
    </TableRow>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx turbo run typecheck --filter=@trycompai/app
```

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/app/(app)/\[orgId\]/frameworks/\[frameworkInstanceId\]/components/FrameworkControlsGrouped.tsx
git commit -m "feat(app): add FrameworkControlsGrouped component with expand/collapse"
```

---

### Task 7: Wire Up Grouped View in `FrameworkDetailContent`

**Files:**
- Modify: `apps/app/src/app/(app)/[orgId]/frameworks/[frameworkInstanceId]/components/FrameworkDetailContent.tsx:196-203`

- [ ] **Step 1: Import `FrameworkControlsGrouped` and add switching logic**

Add the import at the top of `FrameworkDetailContent.tsx`:

```typescript
import { FrameworkControlsGrouped } from './FrameworkControlsGrouped';
```

Then add a `useMemo` to detect whether controls have family data (put it near the other data setup, around line ~70):

```typescript
  const hasControlFamilies = useMemo(
    () =>
      frameworkInstanceWithControls.controls.some(
        (c) => c.controlTemplate?.controlFamily,
      ),
    [frameworkInstanceWithControls.controls],
  );
```

- [ ] **Step 2: Replace the controls tab content**

Replace lines 196-203 (the `<TabsContent value="controls">` block):

```tsx
        <TabsContent value="controls">
          {hasControlFamilies ? (
            <FrameworkControlsGrouped
              frameworkInstanceWithControls={frameworkInstanceWithControls}
              requirementDefinitions={requirementDefinitions}
              tasks={tasks}
              evidenceSubmissions={evidenceSubmissions}
            />
          ) : (
            <FrameworkControls
              frameworkInstanceWithControls={frameworkInstanceWithControls}
              requirementDefinitions={requirementDefinitions}
              tasks={tasks}
              evidenceSubmissions={evidenceSubmissions}
            />
          )}
        </TabsContent>
```

- [ ] **Step 3: Verify typecheck**

```bash
npx turbo run typecheck --filter=@trycompai/app
```

- [ ] **Step 4: Commit**

```bash
git add apps/app/src/app/(app)/\[orgId\]/frameworks/\[frameworkInstanceId\]/components/FrameworkDetailContent.tsx
git commit -m "feat(app): switch between flat and grouped controls view based on family data"
```

---

### Task 8: Framework Editor — Add `controlFamily` Column

**Files:**
- Modify: `apps/framework-editor/app/(pages)/controls/ControlsClientPage.tsx`
- Modify: `apps/framework-editor/app/(pages)/controls/types.ts`
- Modify: `apps/framework-editor/app/(pages)/controls/hooks/useChangeTracking.ts`

- [ ] **Step 1: Add `controlFamily` to `ControlsPageGridData` type**

In `apps/framework-editor/app/(pages)/controls/types.ts`, add `controlFamily` to `ControlsPageGridData`:

```typescript
export type ControlsPageGridData = {
  id: string;
  name: string | null;
  description: string | null;
  controlFamily: string | null;
  policyTemplates: ItemWithName[];
  requirements: RequirementGridItem[];
  taskTemplates: ItemWithName[];
  documentTypes: string[];
  policyTemplatesLength: number;
  requirementsLength: number;
  taskTemplatesLength: number;
  documentTypesLength: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};
```

- [ ] **Step 2: Add `controlFamily` to `ControlMutations` interface**

In `apps/framework-editor/app/(pages)/controls/hooks/useChangeTracking.ts`, update the mutation interfaces:

```typescript
export interface ControlMutations {
  createControl: (data: {
    name: string | null;
    description: string | null;
    controlFamily: string | null;
    documentTypes: string[];
  }) => Promise<{ id: string }>;
  updateControl: (
    id: string,
    data: { name: string; description: string; controlFamily: string | null; documentTypes: string[] },
  ) => Promise<unknown>;
  deleteControl: (id: string) => Promise<unknown>;
}
```

- [ ] **Step 3: Include `controlFamily` in `handleCommit` data**

In the same file, update the `handleCommit` callback. In the create loop (line ~151):

```typescript
          const newControl = await mutations.createControl({
            name: row.name,
            description: row.description,
            controlFamily: row.controlFamily,
            documentTypes: row.documentTypes,
          });
```

In the update loop (line ~186):

```typescript
          await mutations.updateControl(id, {
            name: row.name,
            description: row.description || '',
            controlFamily: row.controlFamily,
            documentTypes: row.documentTypes,
          });
```

- [ ] **Step 4: Add `controlFamily` to grid data mapping in `ControlsClientPage.tsx`**

In `ControlsClientPage.tsx`, update the `initialGridData` mapping (line ~120) to include:

```typescript
        controlFamily: control.controlFamily ?? null,
```

And update the `mutations` useMemo (line ~92) to pass `controlFamily`:

```typescript
      createControl: (data: {
        name: string | null;
        description: string | null;
        controlFamily: string | null;
        documentTypes: string[];
      }) =>
        apiClient<{ id: string }>('/control-template', {
          method: 'POST',
          body: JSON.stringify({ ...data, frameworkId }),
        }),
      updateControl: (
        id: string,
        data: { name: string; description: string; controlFamily: string | null; documentTypes: string[] },
      ) =>
        apiClient(`/control-template/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...data, frameworkId }),
        }),
```

- [ ] **Step 5: Add the `controlFamily` column to the table**

In `ControlsClientPage.tsx`, add a new column definition after the `description` column (around line ~190):

```typescript
      columnHelper.accessor('controlFamily', {
        header: 'Control Family',
        size: 200,
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            rowId={row.original.id}
            columnId="controlFamily"
            onUpdate={updateCell}
          />
        ),
      }),
```

- [ ] **Step 6: Verify typecheck**

```bash
npx turbo run typecheck --filter=framework-editor
```

If the framework-editor package name differs, find it:

```bash
grep '"name"' apps/framework-editor/package.json
```

- [ ] **Step 7: Commit**

```bash
git add apps/framework-editor/app/\(pages\)/controls/
git commit -m "feat(framework-editor): add controlFamily column to control template editor"
```

---

### Task 9: CS-393 — Remove Duplicate Requirements Heading

**Files:**
- Modify: `apps/app/src/app/(app)/[orgId]/controls/[controlId]/components/RequirementsTable.tsx`

- [ ] **Step 1: Check for duplicate heading**

Read `RequirementsTable.tsx` for any heading that duplicates the tab trigger's "Requirements (N)". Looking at the current file (lines 59-137), there is no `<Heading>` element — the component starts directly with the search input and table. The tab trigger in `SingleControl.tsx` line 59 shows `Requirements ({count})`.

If there IS no duplicate heading in `RequirementsTable.tsx`, then CS-393 may already be resolved or the duplicate exists elsewhere. Check `SingleControl.tsx` — the tabs already show the count, and the tab content directly renders `RequirementsTable` without an additional heading.

Verify by running the app and inspecting the control detail page. If no duplicate exists, mark CS-393 as already satisfied by the current code.

- [ ] **Step 2: If a duplicate heading exists, remove it**

Remove the `<Heading>` or `<h2>` element that shows "Requirements (N)" inside the tab content. Keep only the tab trigger's label.

- [ ] **Step 3: Commit (if changes made)**

```bash
git add apps/app/src/app/(app)/\[orgId\]/controls/\[controlId\]/components/RequirementsTable.tsx
git commit -m "fix(app): remove duplicate requirements heading (CS-393)"
```

---

### Task 10: Verify End-to-End

- [ ] **Step 1: Run full typecheck**

```bash
npx turbo run typecheck
```

- [ ] **Step 2: Run app tests**

```bash
cd apps/app && npx vitest run
```

- [ ] **Step 3: Run API tests**

```bash
cd apps/api && npx jest --passWithNoTests
```

- [ ] **Step 4: Start the dev server and test manually**

```bash
cd /Users/mariano/code/comp/.worktrees/nist-sp800-53-readiness
bun run --filter '@trycompai/app' dev:no-trigger
```

In a separate terminal:

```bash
bun run --filter '@trycompai/api' dev:no-trigger
```

Test the following:
1. Open a framework that has controls with `controlFamily` set — verify grouped view shows
2. Open a framework without control families — verify flat view still works
3. Expand/collapse individual families
4. Click "Expand All" / "Collapse All"
5. Search for a control — verify matching families auto-expand
6. Clear search — verify families collapse back
7. Click a control row — verify navigation to control detail works
8. In the framework editor, add/edit the `controlFamily` field on a control template

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(app): address issues found during e2e verification"
```
