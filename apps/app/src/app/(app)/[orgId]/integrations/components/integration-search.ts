export function matchesIntegrationSearch(searchText: string, searchQuery: string): boolean {
  const terms = searchQuery.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (terms.length === 0) return true;

  const tokens = searchText.toLowerCase().match(/[a-z0-9]+/g) ?? [];

  return terms.every((term) => tokens.some((token) => token.startsWith(term)));
}
