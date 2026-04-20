import type { CheckVariable, CheckVariableValues } from '../../types';
import type { VercelProject, VercelProjectsResponse } from './types';

export type VercelProjectFilterMode = 'all' | 'include' | 'exclude';

export interface VercelProjectFilter {
  mode: VercelProjectFilterMode;
  selectedIds: Set<string>;
}

const VALID_MODES: ReadonlySet<string> = new Set<VercelProjectFilterMode>([
  'all',
  'include',
  'exclude',
]);

export function parseVercelProjectFilter(
  variables: CheckVariableValues | undefined,
): VercelProjectFilter {
  const rawMode = variables?.project_filter_mode;
  const mode: VercelProjectFilterMode =
    typeof rawMode === 'string' && VALID_MODES.has(rawMode)
      ? (rawMode as VercelProjectFilterMode)
      : 'all';

  const rawSelected = variables?.filtered_projects;
  const selectedIds = new Set<string>(
    Array.isArray(rawSelected) ? (rawSelected.filter((v) => typeof v === 'string') as string[]) : [],
  );

  return { mode, selectedIds };
}

export function applyVercelProjectFilter<T extends Pick<VercelProject, 'id'>>(
  projects: T[],
  filter: VercelProjectFilter,
): T[] {
  if (filter.mode === 'all' || filter.selectedIds.size === 0) {
    return projects;
  }
  if (filter.mode === 'include') {
    return projects.filter((p) => filter.selectedIds.has(p.id));
  }
  return projects.filter((p) => !filter.selectedIds.has(p.id));
}

export const projectFilterModeVariable: CheckVariable = {
  id: 'project_filter_mode',
  label: 'Projects to check',
  helpText:
    'Choose which Vercel projects this automation checks. Pick "Only selected" or "Exclude selected" to narrow the scope.',
  type: 'select',
  required: false,
  default: 'all',
  options: [
    { value: 'all', label: 'All projects' },
    { value: 'include', label: 'Only selected projects' },
    { value: 'exclude', label: 'Exclude selected projects' },
  ],
};

export const filteredProjectsVariable: CheckVariable = {
  id: 'filtered_projects',
  label: 'Projects',
  helpText:
    'Select projects to include or exclude based on the mode above. Ignored when mode is "All projects".',
  type: 'multi-select',
  required: false,
  placeholder: 'Select projects…',
  fetchOptions: async (ctx) => {
    // OAuth token is installation-scoped (one installation = one team or personal account),
    // so /v9/projects returns projects visible to this connection without an explicit teamId.
    const response = await ctx.fetch<VercelProjectsResponse>('/v9/projects');
    const projects = response.projects ?? [];
    return projects
      .map((p) => ({ value: p.id, label: p.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  },
};
