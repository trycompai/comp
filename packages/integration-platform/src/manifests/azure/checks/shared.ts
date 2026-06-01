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
  if (typeof configured === 'string' && configured.length > 0) {
    return configured;
  }
  try {
    const data = await ctx.fetch<{
      value?: Array<{ subscriptionId: string; state?: string }>;
    }>(`${ARM}/subscriptions?api-version=2020-01-01`);
    const subs = data.value ?? [];
    const active = subs.find((s) => s.state === 'Enabled') ?? subs[0];
    return active?.subscriptionId ?? null;
  } catch {
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
    pages++;
  }
  return out;
}

export const ARM_BASE = ARM;
