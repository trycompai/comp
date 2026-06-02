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
  if (Array.isArray(selected) && selected.length > 0) {
    return selected.filter((p): p is string => typeof p === 'string');
  }

  try {
    const orgData = await ctx.fetch<{
      organizations?: Array<{ name: string; state?: string }>;
    }>('https://cloudresourcemanager.googleapis.com/v3/organizations:search');
    const activeOrg = (orgData.organizations ?? []).find(
      (o) => o.state === 'ACTIVE',
    );
    const orgId = activeOrg?.name?.replace('organizations/', '');
    const filter = orgId
      ? `lifecycleState:ACTIVE AND parent.id:${orgId}`
      : 'lifecycleState:ACTIVE';
    const data = await ctx.fetch<{ projects?: Array<{ projectId: string }> }>(
      `/v1/projects?filter=${encodeURIComponent(filter)}&pageSize=50`,
    );
    return (data.projects ?? []).map((p) => p.projectId).slice(0, 50);
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
