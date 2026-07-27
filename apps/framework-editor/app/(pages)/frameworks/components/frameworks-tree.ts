import type { FrameworkFamilyWithCount, FrameworkWithCounts } from '../FrameworksClientPage';
import type { TreeRow } from './FrameworksTreeTable';

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { numeric: true });

interface BuildTreeArgs {
  families: FrameworkFamilyWithCount[];
  /** Search-filtered frameworks grouped by familyId. */
  frameworksByFamilyId: Map<string, FrameworkWithCounts[]>;
  /** Search-filtered frameworks with no family. */
  ungrouped: FrameworkWithCounts[];
  /** Ids of expanded families. */
  expanded: Set<string>;
  /** Whether a search filter is active. */
  searching: boolean;
}

/**
 * Flattens families (folders) and frameworks (files) into a single Finder-style
 * row list: roots (families + ungrouped frameworks) are intermixed
 * alphabetically; an expanded family's frameworks follow it as indented rows.
 * While searching, families with no matching frameworks are hidden and the rest
 * are force-expanded so matches are visible.
 */
export function buildFrameworkTreeRows({
  families,
  frameworksByFamilyId,
  ungrouped,
  expanded,
  searching,
}: BuildTreeArgs): TreeRow[] {
  const roots: {
    name: string;
    family?: FrameworkFamilyWithCount;
    framework?: FrameworkWithCounts;
  }[] = [];

  for (const family of families) {
    if (searching && (frameworksByFamilyId.get(family.id)?.length ?? 0) === 0) continue;
    roots.push({ name: family.name, family });
  }
  for (const framework of ungrouped) roots.push({ name: framework.name, framework });
  roots.sort(byName);

  const rows: TreeRow[] = [];
  for (const root of roots) {
    if (root.family) {
      const isExpanded = searching || expanded.has(root.family.id);
      rows.push({ kind: 'family', family: root.family, expanded: isExpanded });
      if (isExpanded) {
        const children = [...(frameworksByFamilyId.get(root.family.id) ?? [])].sort(byName);
        for (const framework of children) {
          rows.push({ kind: 'framework', framework, indented: true });
        }
      }
    } else if (root.framework) {
      rows.push({ kind: 'framework', framework: root.framework, indented: false });
    }
  }
  return rows;
}
