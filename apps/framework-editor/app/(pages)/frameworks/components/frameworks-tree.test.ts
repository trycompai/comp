import { describe, expect, it } from 'vitest';
import type { FrameworkFamilyWithCount, FrameworkWithCounts } from '../FrameworksClientPage';
import { buildFrameworkTreeRows } from './frameworks-tree';

const fam = (id: string, name: string, count = 1): FrameworkFamilyWithCount => ({
  id,
  name,
  description: '',
  status: 'visible',
  frameworksCount: count,
  createdAt: '',
  updatedAt: '',
});

const fw = (id: string, name: string, familyId: string | null): FrameworkWithCounts =>
  ({
    id,
    name,
    familyId,
    version: '1.0',
    description: '',
    visible: true,
    requirementsCount: 0,
    controlsCount: 0,
    latestVersion: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as unknown as FrameworkWithCounts;

function group(frameworks: FrameworkWithCounts[]) {
  const map = new Map<string, FrameworkWithCounts[]>();
  const ungrouped: FrameworkWithCounts[] = [];
  for (const f of frameworks) {
    if (f.familyId) {
      const arr = map.get(f.familyId) ?? [];
      arr.push(f);
      map.set(f.familyId, arr);
    } else {
      ungrouped.push(f);
    }
  }
  return { frameworksByFamilyId: map, ungrouped };
}

const label = (r: ReturnType<typeof buildFrameworkTreeRows>[number]) =>
  r.kind === 'family' ? `📁 ${r.family.name}` : `${r.indented ? '  ' : ''}${r.framework.name}`;

describe('buildFrameworkTreeRows', () => {
  it('intermixes families and ungrouped frameworks alphabetically at the root', () => {
    const families = [fam('z', 'Zebra'), fam('a', 'Alpha')];
    const { frameworksByFamilyId, ungrouped } = group([
      fw('fz', 'Z-child', 'z'),
      fw('fa', 'A-child', 'a'),
      fw('m', 'Mango', null),
    ]);
    const rows = buildFrameworkTreeRows({
      families,
      frameworksByFamilyId,
      ungrouped,
      expanded: new Set(),
      searching: false,
    });
    // Collapsed families show no children; root order is alphabetical.
    expect(rows.map(label)).toEqual(['📁 Alpha', 'Mango', '📁 Zebra']);
  });

  it('shows an expanded family’s frameworks indented beneath it, sorted', () => {
    const families = [fam('g', 'Govern', 2)];
    const { frameworksByFamilyId, ungrouped } = group([
      fw('b', 'GV.B', 'g'),
      fw('a', 'GV.A', 'g'),
    ]);
    const rows = buildFrameworkTreeRows({
      families,
      frameworksByFamilyId,
      ungrouped,
      expanded: new Set(['g']),
      searching: false,
    });
    expect(rows.map(label)).toEqual(['📁 Govern', '  GV.A', '  GV.B']);
    expect(rows[1]).toMatchObject({ kind: 'framework', indented: true });
  });

  it('hides empty families and force-expands the rest while searching', () => {
    const families = [fam('h', 'Has Match'), fam('e', 'Empty After Filter')];
    // Only the "Has Match" family has a (filtered) child.
    const { frameworksByFamilyId, ungrouped } = group([fw('c', 'CC6.1', 'h')]);
    const rows = buildFrameworkTreeRows({
      families,
      frameworksByFamilyId,
      ungrouped,
      expanded: new Set(), // not expanded — but searching forces it open
      searching: true,
    });
    expect(rows.map(label)).toEqual(['📁 Has Match', '  CC6.1']);
  });
});
