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
    items: items.sort((a, b) => a.control.name.localeCompare(b.control.name)),
  }));

  if (otherItems.length > 0) {
    groups.push({
      family: UNCATEGORIZED_FAMILY,
      items: otherItems.sort((a, b) => a.control.name.localeCompare(b.control.name)),
    });
  }

  return groups;
}

/** Returns the display label for a family key (handles the uncategorized sentinel). */
export function getFamilyDisplayLabel(family: string): string {
  return family === UNCATEGORIZED_FAMILY ? UNCATEGORIZED_FAMILY_LABEL : family;
}
