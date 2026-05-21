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
