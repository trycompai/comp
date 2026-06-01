import { describe, expect, it } from 'vitest';
import {
  areAllFamiliesExpanded,
  isFamilyExpanded,
  toggleAllFamilyExpansion,
  toggleFamilyExpansion,
} from './family-expansion-state';

describe('family expansion state', () => {
  it('defaults families to collapsed until expanded by the user', () => {
    expect(
      isFamilyExpanded({
        expandedFamilies: new Set(),
        family: 'Access Control',
        isSearching: false,
      }),
    ).toBe(false);
  });

  it('expands families while searching without changing saved expansion state', () => {
    expect(
      isFamilyExpanded({
        expandedFamilies: new Set(),
        family: 'Access Control',
        isSearching: true,
      }),
    ).toBe(true);
  });

  it('toggles one family at a time', () => {
    const expanded = toggleFamilyExpansion({
      expandedFamilies: new Set(),
      family: 'Access Control',
    });
    expect(expanded.has('Access Control')).toBe(true);

    const collapsed = toggleFamilyExpansion({
      expandedFamilies: expanded,
      family: 'Access Control',
    });
    expect(collapsed.has('Access Control')).toBe(false);
  });

  it('expands and collapses all visible families', () => {
    const familyNames = ['Access Control', 'Audit'];
    const expanded = toggleAllFamilyExpansion({
      expandedFamilies: new Set(),
      familyNames,
      shouldExpand: true,
    });

    expect(
      areAllFamiliesExpanded({
        expandedFamilies: expanded,
        familyNames,
      }),
    ).toBe(true);

    const collapsed = toggleAllFamilyExpansion({
      expandedFamilies: expanded,
      familyNames,
      shouldExpand: false,
    });

    expect(
      areAllFamiliesExpanded({
        expandedFamilies: collapsed,
        familyNames,
      }),
    ).toBe(false);
  });
});
