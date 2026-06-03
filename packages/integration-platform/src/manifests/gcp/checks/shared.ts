import type { CheckContext } from '../../../types';

/**
 * Resolve which GCP projects a check should evaluate: the user-selected
 * `project_ids` variable if present, otherwise a bounded best-effort
 * detection of active projects. Returns [] when none can be resolved — the
 * check should then no-op (emit neither pass nor fail) rather than produce a
 * false pass.
 */
export async function resolveGcpProjectIds(ctx: CheckContext): Promise<string[]> {
  const selected = ctx.variables.project_ids;
  if (Array.isArray(selected)) {
    // Sanitize: keep only non-empty, trimmed string ids. If nothing valid
    // remains, fall through to discovery rather than returning [] and skipping.
    const cleaned = selected
      .filter((p): p is string => typeof p === 'string')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (cleaned.length > 0) return cleaned;
  }

  try {
    // List every active project the connection can access. We intentionally do
    // NOT scope by organization/parent: a `parent.id` filter without
    // `parent.type` is ambiguous, AND parent-scoping silently excludes
    // folder-nested projects, both of which would drop projects that should be
    // evaluated. Users scope to a subset explicitly via the project_ids
    // variable. Page through all results (bounded) rather than the first page —
    // silently dropping projects would produce false "all clean" evidence.
    const filter = 'lifecycleState:ACTIVE';
    const projectIds: string[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    do {
      const tokenParam = pageToken
        ? `&pageToken=${encodeURIComponent(pageToken)}`
        : '';
      const data: {
        projects?: Array<{ projectId: string }>;
        nextPageToken?: string;
      } = await ctx.fetch(
        `/v1/projects?filter=${encodeURIComponent(filter)}&pageSize=100${tokenParam}`,
      );
      for (const p of data.projects ?? []) projectIds.push(p.projectId);
      pageToken =
        typeof data.nextPageToken === 'string' ? data.nextPageToken : undefined;
      pages++;
    } while (pageToken && pages < 20);
    if (pageToken) {
      ctx.warn(
        'GCP project auto-discovery hit the page cap; some projects may not be evaluated — set project_ids to scope explicitly',
        { pages, discovered: projectIds.length },
      );
    }
    return projectIds;
  } catch (err) {
    ctx.warn('GCP project auto-discovery failed; checks will be skipped', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Page through a GCP list endpoint that returns `{ [itemsKey]: T[], nextPageToken? }`,
 * following `nextPageToken` via the `pageToken` query param. Bounded to avoid
 * runaway on very large projects.
 */
export async function gcpListItems<T>(
  ctx: CheckContext,
  url: string,
  itemsKey = 'items',
): Promise<T[]> {
  const out: T[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const sep = url.includes('?') ? '&' : '?';
    const pageUrl = pageToken
      ? `${url}${sep}pageToken=${encodeURIComponent(pageToken)}`
      : url;
    const data = await ctx.fetch<Record<string, unknown>>(pageUrl);
    const items = data[itemsKey];
    if (Array.isArray(items)) out.push(...(items as T[]));
    pageToken =
      typeof data.nextPageToken === 'string' ? data.nextPageToken : undefined;
    pages++;
  } while (pageToken && pages < 50);
  if (pageToken) {
    ctx.warn('GCP list hit the page cap; results may be truncated', {
      url,
      pages,
    });
  }
  return out;
}

/**
 * True if a GCP firewall `ports` spec covers `target` (single port or "a-b"
 * range). An empty/absent spec means "all ports".
 */
export function portsCover(
  ports: string[] | undefined,
  target: number,
): boolean {
  if (!ports || ports.length === 0) return true;
  return ports.some((spec) => {
    if (spec.includes('-')) {
      const [lo, hi] = spec.split('-').map((n) => Number(n));
      return (
        Number.isFinite(lo) && Number.isFinite(hi) && target >= lo && target <= hi
      );
    }
    return Number(spec) === target;
  });
}
