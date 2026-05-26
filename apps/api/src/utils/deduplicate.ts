export function deduplicateBy<T>(
  items: T[],
  key: (item: T) => string,
): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  return deduplicateBy(items, (item) => item.id);
}

export function deduplicateByFormType<T extends { formType: string }>(
  items: T[],
): T[] {
  return deduplicateBy(items, (item) => item.formType);
}
