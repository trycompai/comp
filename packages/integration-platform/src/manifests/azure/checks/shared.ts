import type { CheckContext } from '../../../types';

const ARM = 'https://management.azure.com';

/**
 * Resolve the Azure subscription to scan: the user-set `subscription_id`
 * variable, else the first enabled subscription the token can see. Returns
 * null when none — the check should then no-op (no false pass).
 */
export async function resolveAzureSubscriptionId(
  ctx: CheckContext,
): Promise<string | null> {
  const configured = ctx.variables.subscription_id;
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim();
  }
  try {
    const data = await ctx.fetch<{
      value?: Array<{ subscriptionId: string; state?: string }>;
    }>(`${ARM}/subscriptions?api-version=2020-01-01`);
    const subs = data.value ?? [];
    // Only auto-select an Enabled subscription. Falling back to the first
    // subscription regardless of state could pick a Disabled/PastDue one whose
    // API calls fail; returning null instead makes the check no-op cleanly (the
    // user can set subscription_id explicitly).
    const active = subs.find((s) => s.state === 'Enabled');
    return active?.subscriptionId ?? null;
  } catch (err) {
    ctx.warn(
      'Failed to auto-detect Azure subscription; set subscription_id manually',
      { error: err instanceof Error ? err.message : String(err) },
    );
    return null;
  }
}

/** Paginate an Azure ARM list endpoint (`{ value: T[], nextLink? }`). */
export async function armListAll<T>(
  ctx: CheckContext,
  url: string,
): Promise<T[]> {
  const out: T[] = [];
  let nextUrl: string | undefined = url;
  let pages = 0;
  while (nextUrl && pages < 50) {
    const data: { value?: T[]; nextLink?: string } = await ctx.fetch(nextUrl);
    if (Array.isArray(data.value)) out.push(...data.value);
    nextUrl = data.nextLink;
    // nextLink is an absolute URL from the API; only follow it if it stays on
    // the ARM host, so the injected bearer token can't be sent elsewhere.
    if (nextUrl && !nextUrl.startsWith(`${ARM}/`)) {
      ctx.warn('Azure ARM nextLink pointed to an unexpected host; stopping pagination', {
        nextLink: nextUrl,
      });
      nextUrl = undefined;
    }
    pages++;
  }
  if (nextUrl) {
    ctx.warn('Azure ARM list hit the page cap; results may be truncated', {
      url,
      pages,
    });
  }
  return out;
}

/**
 * Paginate an ARM list endpoint, emitting a "could not verify" finding (and
 * returning null) if the read throws. Use this for a check's primary list so a
 * permission/transient failure surfaces as explicit evidence with remediation
 * rather than aborting the check with a bare error or a false verdict.
 */
export async function armListAllOrFail<T>(
  ctx: CheckContext,
  url: string,
  opts: { what: string; resourceType: string; subscriptionId: string },
): Promise<T[] | null> {
  try {
    return await armListAll<T>(ctx, url);
  } catch (err) {
    ctx.fail({
      title: `Could not verify ${opts.what}`,
      description: `${opts.what} could not be listed from Azure, so this check is unverified.`,
      resourceType: opts.resourceType,
      resourceId: opts.subscriptionId,
      severity: 'medium',
      remediation:
        'Ensure the connection has Reader access to the subscription, then re-run the check.',
      evidence: { error: err instanceof Error ? err.message : String(err) },
    });
    return null;
  }
}

export const ARM_BASE = ARM;
