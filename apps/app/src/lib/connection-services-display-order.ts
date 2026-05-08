/**
 * Order services for the integration / cloud-tests grid:
 * - All enabled before disabled (including ids in `tailEnabledIds` while toggling on).
 * - Enabled: manifest order for items not in `tailEnabledIds`, then tail ids in order.
 * - Disabled: manifest order.
 */
export function orderServicesForConnectionGrid<
  T extends { id: string; name: string },
>(params: {
  manifestServices: T[] | undefined;
  connectionServices: Array<{ id: string; enabled: boolean }> | undefined;
  search: string;
  /** Session toggles-on, kept at end of enabled block (see ServicesGrid). */
  tailEnabledIds?: string[];
}): T[] {
  const { manifestServices, connectionServices, search, tailEnabledIds } = params;

  const manifest = manifestServices ?? [];
  const conn = connectionServices ?? [];
  const tailIds = tailEnabledIds ?? [];
  const tailSet = new Set(tailIds);

  const enabledFromServer = new Set(conn.filter((s) => s.enabled).map((s) => s.id));

  const isEnabledForSort = (id: string) =>
    enabledFromServer.has(id) || tailSet.has(id);

  const manifestIndexById = new Map(manifest.map((s, i) => [s.id, i] as const));

  const filtered = search.trim()
    ? manifest.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.id.toLowerCase().includes(search.toLowerCase()),
      )
    : manifest;

  const enabledInFilter = filtered.filter((s) => isEnabledForSort(s.id));
  const disabledInFilter = filtered.filter((s) => !isEnabledForSort(s.id));

  const baseEnabled = enabledInFilter
    .filter((s) => !tailSet.has(s.id))
    .sort((a, b) => (manifestIndexById.get(a.id) ?? 0) - (manifestIndexById.get(b.id) ?? 0));

  const seenTail = new Set<string>();
  const tailEnabled: T[] = [];
  for (const id of tailIds) {
    if (seenTail.has(id)) continue;
    seenTail.add(id);
    if (!isEnabledForSort(id)) continue;
    if (!filtered.some((f) => f.id === id)) continue;
    const row = manifest.find((m) => m.id === id);
    if (row) tailEnabled.push(row);
  }

  const disabledSorted = [...disabledInFilter].sort(
    (a, b) => (manifestIndexById.get(a.id) ?? 0) - (manifestIndexById.get(b.id) ?? 0),
  );

  return [...baseEnabled, ...tailEnabled, ...disabledSorted];
}
