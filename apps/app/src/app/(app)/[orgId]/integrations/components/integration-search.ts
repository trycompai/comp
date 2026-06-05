const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function matchesIntegrationNameSearch(name: string, searchQuery: string): boolean {
  const terms = searchQuery.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (terms.length === 0) return true;

  const normalizedName = normalizeSearchText(name);

  return terms.every((term) => normalizedName.includes(term));
}
