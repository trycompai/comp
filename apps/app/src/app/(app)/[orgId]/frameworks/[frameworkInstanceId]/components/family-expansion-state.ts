interface FamilyExpansionParams {
  expandedFamilies: Set<string>;
  family: string;
  isSearching: boolean;
}

interface ToggleAllFamilyExpansionParams {
  expandedFamilies: Set<string>;
  familyNames: string[];
  shouldExpand: boolean;
}

interface FamilyExpansionListParams {
  expandedFamilies: Set<string>;
  familyNames: string[];
}

interface ToggleFamilyExpansionParams {
  expandedFamilies: Set<string>;
  family: string;
}

export function isFamilyExpanded({
  expandedFamilies,
  family,
  isSearching,
}: FamilyExpansionParams): boolean {
  return isSearching || expandedFamilies.has(family);
}

export function areAllFamiliesExpanded({
  expandedFamilies,
  familyNames,
}: FamilyExpansionListParams): boolean {
  return (
    familyNames.length > 0 &&
    familyNames.every((family) => expandedFamilies.has(family))
  );
}

export function toggleFamilyExpansion({
  expandedFamilies,
  family,
}: ToggleFamilyExpansionParams): Set<string> {
  const next = new Set(expandedFamilies);
  if (next.has(family)) {
    next.delete(family);
  } else {
    next.add(family);
  }
  return next;
}

export function toggleAllFamilyExpansion({
  expandedFamilies,
  familyNames,
  shouldExpand,
}: ToggleAllFamilyExpansionParams): Set<string> {
  const next = new Set(expandedFamilies);
  for (const family of familyNames) {
    if (shouldExpand) {
      next.add(family);
    } else {
      next.delete(family);
    }
  }
  return next;
}
