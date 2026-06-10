import type { CheckContext } from '../../../types';
import { remediationForReadFailure, toHttpReadFailure } from '../../http-read-failure';

const ARM = 'https://management.azure.com';

/** Fan-out bound for auto-discovered subscriptions (13 checks × N subs). */
const MAX_SUBSCRIPTIONS = 50;

/** The legacy single-subscription variable (auto-saved by Cloud Tests
 * detection or typed manually). Kept as the no-selection default so existing
 * connections keep their exact pre-picker scan scope. */
function legacySubscriptionId(ctx: CheckContext): string | null {
  const configured = ctx.variables.subscription_id;
  return typeof configured === 'string' && configured.trim().length > 0
    ? configured.trim()
    : null;
}

/**
 * Resolve the Azure subscriptions a check should evaluate.
 *
 * Scanning MORE than one subscription is strictly opt-in: customers select
 * subscriptions (one, several, or all) via the `subscription_ids` variable.
 * Without a selection the behavior is identical to before the picker existed —
 * the saved `subscription_id`, else the first Enabled subscription — so a
 * deploy never silently expands an existing customer's scan scope.
 *
 * Returns [] only after emitting an explicit "could not verify" finding, so a
 * scope failure never leaves the mapped tasks silently stale.
 */
export async function resolveAzureSubscriptionIds(
  ctx: CheckContext,
): Promise<string[]> {
  const selected = ctx.variables.subscription_ids;
  if (Array.isArray(selected)) {
    const cleaned = selected
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (cleaned.length > MAX_SUBSCRIPTIONS) {
      // Bound the fan-out (13 checks x N subs) to protect the run budget —
      // and surface the gap as a FINDING: scanning less than the customer
      // selected must never hide in a run log.
      const unscanned = cleaned.slice(MAX_SUBSCRIPTIONS);
      ctx.fail({
        title: `Subscription selection exceeds the scan limit (${cleaned.length} selected, ${MAX_SUBSCRIPTIONS} scanned)`,
        description: `${unscanned.length} selected subscription(s) were not scanned because runs are limited to ${MAX_SUBSCRIPTIONS} subscriptions. Resources in the unscanned subscriptions are unverified.`,
        resourceType: 'azure-subscription',
        resourceId: 'subscription-scope',
        severity: 'medium',
        remediation: `Reduce the selection to at most ${MAX_SUBSCRIPTIONS} subscriptions, or contact support to raise the limit for this connection.`,
        evidence: {
          selected: cleaned.length,
          scanned: MAX_SUBSCRIPTIONS,
          unscannedSubscriptionIds: unscanned,
        },
      });
      return cleaned.slice(0, MAX_SUBSCRIPTIONS);
    }
    if (cleaned.length > 0) return cleaned;
  }

  // No explicit selection: preserve the pre-picker behavior exactly.
  const legacy = legacySubscriptionId(ctx);
  if (legacy) return [legacy];

  try {
    const data = await ctx.fetch<{
      value?: Array<{ subscriptionId: string; state?: string }>;
    }>(`${ARM}/subscriptions?api-version=2020-01-01`);
    // Only Enabled subscriptions — a Disabled/PastDue one would fail every
    // API call and drown the run in false "could not verify" findings.
    const enabled = (data.value ?? [])
      .filter((s) => s.state === 'Enabled')
      .map((s) => s.subscriptionId);
    if (enabled.length > 0) {
      if (enabled.length > 1) {
        ctx.log(
          `Azure: ${enabled.length} enabled subscriptions visible but none selected — scanning "${enabled[0]}" only. Select subscriptions in the integration settings to scan more.`,
        );
      }
      return [enabled[0]!];
    }
    ctx.fail({
      title: 'Could not verify Azure subscription scope',
      description:
        'No enabled Azure subscription is visible to the connection, so nothing could be scanned.',
      resourceType: 'azure-subscription',
      resourceId: 'unknown',
      severity: 'medium',
      remediation:
        'Grant the connection Reader access to at least one subscription (or select subscriptions in the integration settings), then re-run the check.',
      evidence: { enabledSubscriptionsVisible: 0 },
    });
    return [];
  } catch (err) {
    const failure = toHttpReadFailure(err);
    ctx.fail({
      title: 'Could not verify Azure subscription scope',
      description: `Azure subscriptions could not be listed (${failure.error}), so nothing could be scanned.`,
      resourceType: 'azure-subscription',
      resourceId: 'unknown',
      severity: 'medium',
      remediation: remediationForReadFailure(
        failure,
        'Grant the connection Reader access to the subscription(s), then re-run the check.',
      ),
      evidence: { readError: failure.error },
    });
    return [];
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
    const failure = toHttpReadFailure(err);
    ctx.fail({
      title: `Could not verify ${opts.what}`,
      description: `${opts.what} could not be listed from Azure (${failure.error}), so this check is unverified.`,
      resourceType: opts.resourceType,
      resourceId: opts.subscriptionId,
      severity: 'medium',
      remediation: remediationForReadFailure(
        failure,
        'Ensure the connection has Reader access to the subscription, then re-run the check.',
      ),
      evidence: { readError: failure.error },
    });
    return null;
  }
}

export const ARM_BASE = ARM;
