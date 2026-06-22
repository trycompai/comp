import type { StatusType } from '@/components/status-indicator';
import {
  type EvidenceSubmissionInfo,
  type RequirementArtifactCounts,
  getControlProgressPercent,
  getControlStatus,
  getRequirementArtifactCounts,
  getRequirementCompliancePercent,
} from '@/lib/control-compliance';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import type { Control, FrameworkEditorRequirement, Task } from '@db';

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

/** Sentinel value for uncategorized controls — avoids collision with a real family named "Other". */
export const UNCATEGORIZED_FAMILY = '__uncategorized__';

/** Display label for the uncategorized family group. */
export const UNCATEGORIZED_FAMILY_LABEL = 'Other';

export interface FamilyGroup {
  family: string;
  items: ControlItem[];
}

export function groupByFamily(items: ControlItem[]): FamilyGroup[] {
  const familyMap = new Map<string, ControlItem[]>();
  const otherItems: ControlItem[] = [];

  for (const item of items) {
    const family = item.control.controlFamily;
    if (family) {
      const existing = familyMap.get(family);
      if (existing) {
        existing.push(item);
      } else {
        familyMap.set(family, [item]);
      }
    } else {
      otherItems.push(item);
    }
  }

  const sortedFamilies = Array.from(familyMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const groups: FamilyGroup[] = sortedFamilies.map(([family, items]) => ({
    family,
    items: items.sort((a, b) => a.control.name.localeCompare(b.control.name, undefined, { numeric: true })),
  }));

  if (otherItems.length > 0) {
    groups.push({
      family: UNCATEGORIZED_FAMILY,
      items: otherItems.sort((a, b) => a.control.name.localeCompare(b.control.name, undefined, { numeric: true })),
    });
  }

  return groups;
}

/** Returns the display label for a family key (handles the uncategorized sentinel). */
export function getFamilyDisplayLabel(family: string): string {
  return family === UNCATEGORIZED_FAMILY ? UNCATEGORIZED_FAMILY_LABEL : family;
}

// ---------------------------------------------------------------------------
// Requirement grouping
// ---------------------------------------------------------------------------

export interface RequirementItem extends FrameworkEditorRequirement {
  mappedControlsCount: number;
  satisfiedControlsCount: number;
  compliancePercent: number;
  controlStatuses: StatusType[];
  artifactCounts: RequirementArtifactCounts;
}

export interface RequirementFamilyGroup {
  family: string;
  items: RequirementItem[];
}

/**
 * FRAME-18: order requirements by their per-framework `sortOrder` (numbered
 * rows first, ascending), falling back to identifier (then name) for unset
 * rows and ties. Unset (`null`/`undefined`) rows always sort last.
 */
export function compareRequirementsByOrder(
  a: Pick<FrameworkEditorRequirement, 'sortOrder' | 'identifier' | 'name'>,
  b: Pick<FrameworkEditorRequirement, 'sortOrder' | 'identifier' | 'name'>,
): number {
  const ao = a.sortOrder ?? null;
  const bo = b.sortOrder ?? null;
  if (ao !== bo) {
    if (ao == null) return 1;
    if (bo == null) return -1;
    return ao - bo;
  }
  return (a.identifier ?? a.name).localeCompare(b.identifier ?? b.name, undefined, {
    numeric: true,
  });
}

export function groupRequirementsByFamily(items: RequirementItem[]): RequirementFamilyGroup[] {
  const familyMap = new Map<string, RequirementItem[]>();
  const otherItems: RequirementItem[] = [];

  for (const item of items) {
    const family = item.requirementFamily;
    if (family) {
      const existing = familyMap.get(family);
      if (existing) {
        existing.push(item);
      } else {
        familyMap.set(family, [item]);
      }
    } else {
      otherItems.push(item);
    }
  }

  // FRAME-18: order families by the lowest sortOrder among their requirements so
  // a framework's configured order also drives the family order (e.g. NIST CSF
  // Functions GV → ID → PR → DE → RS → RC). When no requirement has a sortOrder
  // (every existing framework today), every family's min is null and this falls
  // back to alphabetical — identical to the previous behavior.
  const minSortOrder = (familyItems: RequirementItem[]): number | null => {
    let min: number | null = null;
    for (const item of familyItems) {
      if (item.sortOrder == null) continue;
      if (min === null || item.sortOrder < min) min = item.sortOrder;
    }
    return min;
  };
  const sortedFamilies = Array.from(familyMap.entries()).sort(([fa, ia], [fb, ib]) => {
    const ma = minSortOrder(ia);
    const mb = minSortOrder(ib);
    if (ma !== mb) {
      if (ma === null) return 1;
      if (mb === null) return -1;
      return ma - mb;
    }
    return fa.localeCompare(fb);
  });

  const sortItems = compareRequirementsByOrder;

  const groups: RequirementFamilyGroup[] = sortedFamilies.map(([family, familyItems]) => ({
    family,
    items: familyItems.sort(sortItems),
  }));

  if (otherItems.length > 0) {
    groups.push({
      family: UNCATEGORIZED_FAMILY,
      items: otherItems.sort(sortItems),
    });
  }

  return groups;
}

export function buildRequirementItems(
  requirementDefinitions: FrameworkEditorRequirement[],
  controls: FrameworkInstanceWithControls['controls'],
  tasks: (Task & { controls: Control[] })[],
  evidenceSubmissions: EvidenceSubmissionInfo[],
): RequirementItem[] {
  return requirementDefinitions.map((def) => {
    const mappedControls = controls.filter(
      (control) =>
        control.requirementsMapped?.some((rm) => rm.requirementId === def.id) ?? false,
    );

    const controlStatuses = mappedControls.map((c) =>
      getControlStatus(c.policies, tasks, c.id, c.controlDocumentTypes, evidenceSubmissions),
    );
    const satisfiedControlsCount = controlStatuses.filter((s) => s === 'completed').length;

    const progressPercents = mappedControls.map((c) =>
      getControlProgressPercent(c.policies, tasks, c.id, c.controlDocumentTypes, evidenceSubmissions),
    );

    return {
      ...def,
      mappedControlsCount: mappedControls.length,
      satisfiedControlsCount,
      compliancePercent: getRequirementCompliancePercent(progressPercents),
      controlStatuses,
      artifactCounts: getRequirementArtifactCounts(mappedControls, tasks, evidenceSubmissions),
    };
  });
}
