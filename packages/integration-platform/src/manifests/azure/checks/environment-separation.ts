import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  classifyEnvironment,
  envTagValues,
} from '../../environment-classification';
import { remediationForReadFailure, toHttpReadFailure } from '../../http-read-failure';
import { ARM_BASE, armListAll } from './shared';

const SUBSCRIPTIONS_API_VERSION = '2020-01-01';
const RESOURCE_GROUPS_API_VERSION = '2021-04-01';
// Bound the resource-group fan-out (one list call per subscription).
const MAX_SUBSCRIPTIONS = 50;

interface Subscription {
  subscriptionId: string;
  displayName?: string;
  state?: string;
}

interface ResourceGroup {
  id: string;
  name: string;
  location?: string;
  tags?: Record<string, string>;
}

/**
 * Classify a resource group into an environment: an explicit `environment` tag
 * value first, then the RG name. Only env-key tag values and the name are
 * considered (never arbitrary tag values).
 */
export function classifyResourceGroupEnv(rg: {
  name: string;
  tags?: Record<string, string>;
}): string | null {
  return classifyEnvironment([...envTagValues(rg.tags), rg.name]);
}

const GUIDANCE =
  'Separate production and non-production into distinct subscriptions (strongest), or tag each resource group with an `environment` tag (e.g. environment=production / environment=staging). If you separate environments another way, upload a console screenshot or architecture diagram as evidence.';

/**
 * Separation of Environments check (heuristic). Evaluates the whole footprint in
 * two tiers, in safety order:
 *  1) Subscriptions — a real isolation/RBAC/billing boundary. If >=2 enabled
 *     subscriptions classify into distinct environments → PASS (strong).
 *  2) Resource groups — the most commonly env-named primitive, but only a
 *     LOGICAL container (shares the subscription's access/network). If >=2
 *     distinct environments across RGs → PASS, explicitly disclosed as logical.
 * Tiers are NOT unioned: a single prod subscription containing an `rg-dev`
 * resource group must not be mistaken for separation. Anything else fails with
 * guidance; the task accepts manual evidence.
 */
export const environmentSeparationCheck: IntegrationCheck = {
  id: 'azure-environment-separation',
  name: 'Separation of environments — production isolated from non-production',
  description:
    'Verify production and non-production are separated across Azure subscriptions or resource groups.',
  service: 'policy',
  taskMapping: TASK_TEMPLATES.separationOfEnvironments,
  run: async (ctx: CheckContext) => {
    // Footprint-wide: list ALL enabled subscriptions directly (separation is a
    // whole-footprint property, so this intentionally ignores subscription
    // scoping the way the GCP check ignores project scoping).
    let subscriptions: Subscription[];
    try {
      const data = await ctx.fetch<{ value?: Subscription[] }>(
        `${ARM_BASE}/subscriptions?api-version=${SUBSCRIPTIONS_API_VERSION}`,
      );
      subscriptions = (data.value ?? []).filter((s) => s.state === 'Enabled');
    } catch (err) {
      const failure = toHttpReadFailure(err);
      ctx.fail({
        title: 'Could not verify environment separation',
        description: `Azure subscriptions could not be listed (${failure.error}), so environment separation could not be evaluated.`,
        resourceType: 'azure-environment-separation',
        resourceId: 'subscriptions',
        severity: 'medium',
        remediation: remediationForReadFailure(
          failure,
          'Grant the connection Reader access to the subscription(s), then re-run the check.',
        ),
        evidence: { readError: failure.error },
      });
      return;
    }

    if (subscriptions.length === 0) {
      ctx.fail({
        title: 'No Azure subscriptions detected',
        description:
          'No enabled Azure subscriptions were accessible, so environment separation could not be evaluated.',
        resourceType: 'azure-environment-separation',
        resourceId: 'subscriptions',
        severity: 'medium',
        remediation:
          'Grant the connection Reader access to your subscriptions, then re-run — or upload a console screenshot / architecture diagram as evidence.',
        evidence: { subscriptionCount: 0 },
      });
      return;
    }

    // Tier 1 (strong): subscription-level separation.
    const subscriptionEnvs = [
      ...new Set(
        subscriptions
          .map((s) => classifyEnvironment([s.displayName]))
          .filter((e): e is string => e !== null),
      ),
    ];
    if (subscriptionEnvs.length >= 2) {
      ctx.pass({
        title: 'Environments separated across subscriptions',
        description: `Detected ${subscriptionEnvs.length} distinct environments across ${subscriptions.length} Azure subscriptions: ${subscriptionEnvs.join(', ')} (subscription-level boundary).`,
        resourceType: 'azure-environment-separation',
        resourceId: 'subscriptions',
        evidence: {
          boundary: 'subscription',
          detectedEnvironments: subscriptionEnvs,
          subscriptionCount: subscriptions.length,
        },
      });
      return;
    }

    // Tier 2 (weak, logical): resource-group-level separation across the
    // footprint. The RG fan-out is bounded (one list call per subscription);
    // a footprint larger than the cap is surfaced as incomplete coverage below,
    // never silently dropped.
    const boundedSubs = subscriptions.slice(0, MAX_SUBSCRIPTIONS);
    const truncated = subscriptions.length > boundedSubs.length;
    const rgEnvSet = new Set<string>();
    const rgSamples: Array<{ name: string; environment: string }> = [];
    let anyRgReadFailed = false;
    for (const sub of boundedSubs) {
      let resourceGroups: ResourceGroup[];
      try {
        resourceGroups = await armListAll<ResourceGroup>(
          ctx,
          `${ARM_BASE}/subscriptions/${sub.subscriptionId}/resourcegroups?api-version=${RESOURCE_GROUPS_API_VERSION}`,
        );
      } catch (err) {
        anyRgReadFailed = true;
        ctx.log(
          `Azure env-separation: could not list resource groups in ${sub.subscriptionId} — ${toHttpReadFailure(err).error}`,
        );
        continue;
      }
      for (const rg of resourceGroups) {
        const env = classifyResourceGroupEnv(rg);
        if (env) {
          rgEnvSet.add(env);
          if (rgSamples.length < 50) rgSamples.push({ name: rg.name, environment: env });
        }
      }
    }
    const resourceGroupEnvs = [...rgEnvSet];
    // A PASS means >=2 environments were positively found; scanning the
    // remaining subscriptions could only ADD environments, never remove the two
    // we already have, so truncation cannot invalidate a pass. The scanned count
    // is still recorded in evidence for transparency.
    if (resourceGroupEnvs.length >= 2) {
      ctx.pass({
        title: 'Environments separated across resource groups',
        description: `Detected ${resourceGroupEnvs.length} distinct environments across resource groups in ${boundedSubs.length} subscription(s): ${resourceGroupEnvs.join(', ')}. Resource-group separation is logical — RGs share the subscription's access and network boundary — not full isolation.`,
        resourceType: 'azure-environment-separation',
        resourceId: 'resource-groups',
        evidence: {
          boundary: 'resource-group',
          detectedEnvironments: resourceGroupEnvs,
          enabledSubscriptions: subscriptions.length,
          subscriptionsScannedForResourceGroups: boundedSubs.length,
          resourceGroups: rgSamples,
        },
      });
      return;
    }

    // Neither tier confirmed separation. Surface any incomplete coverage (read
    // failures and/or the subscription scan cap) so the verdict is never
    // presented as if it covered the whole footprint.
    const detectedAll = [...new Set([...subscriptionEnvs, ...resourceGroupEnvs])];
    const coverageGaps: string[] = [];
    if (truncated) {
      coverageGaps.push(
        `only ${boundedSubs.length} of ${subscriptions.length} enabled subscriptions were scanned for resource groups`,
      );
    }
    if (anyRgReadFailed) {
      coverageGaps.push('some resource groups could not be read');
    }
    const base =
      detectedAll.length === 0
        ? `No Azure subscription or resource group could be classified by environment across ${subscriptions.length} subscription(s)`
        : `Environment(s) detected (${detectedAll.join(', ')}) but not 2+ distinct environments at a single boundary (subscriptions, or resource groups)`;
    ctx.fail({
      // Incomplete coverage that leaves us short of a verdict is "could not
      // verify"; a complete scan that simply found no separation is "could not
      // confirm".
      title:
        coverageGaps.length > 0 && detectedAll.length < 2
          ? 'Could not verify environment separation'
          : 'Could not confirm environment separation',
      description: `${base}${coverageGaps.length ? ` (${coverageGaps.join('; ')})` : ''}, so environment separation could not be confirmed.`,
      resourceType: 'azure-environment-separation',
      resourceId: 'subscriptions',
      severity: 'medium',
      remediation: truncated
        ? `Reduce to at most ${MAX_SUBSCRIPTIONS} enabled subscriptions (or contact support to raise the limit). ${GUIDANCE}`
        : GUIDANCE,
      evidence: {
        subscriptionEnvironments: subscriptionEnvs,
        resourceGroupEnvironments: resourceGroupEnvs,
        enabledSubscriptions: subscriptions.length,
        subscriptionsScannedForResourceGroups: boundedSubs.length,
        resourceGroupsClassified: rgSamples.length,
      },
    });
  },
};
