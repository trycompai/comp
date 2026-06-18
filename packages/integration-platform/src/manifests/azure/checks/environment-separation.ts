import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  classifyEnvironment,
  confirmsEnvironmentSeparation,
  envTagValues,
} from '../../environment-classification';
import { toHttpReadFailure } from '../../http-read-failure';
import { ARM_BASE, armListAllWithCoverage, resolveAzureSubscriptionIds } from './shared';

const SUBSCRIPTION_API_VERSION = '2020-01-01';
const RESOURCE_GROUPS_API_VERSION = '2021-04-01';

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
 * Separation of Environments check (heuristic). Evaluates ONLY the subscriptions
 * the connection is scoped to via `resolveAzureSubscriptionIds` — the same
 * opt-in scope every Azure check honors (selection → legacy single → first
 * enabled). That helper also bounds the fan-out and surfaces an over-limit
 * selection or an unresolvable scope as its own finding, and returns [] when
 * nothing is in scope. Two tiers, in safety order:
 *  1) Subscriptions — a real isolation/RBAC/billing boundary.
 *  2) Resource groups — the most commonly env-named primitive, but only a
 *     LOGICAL container (shares the subscription's access/network).
 * A pass requires a PRODUCTION environment separated from a NON-PRODUCTION one
 * (not merely two non-production environments). Tiers are not unioned; anything
 * else fails with guidance and the task accepts manual evidence.
 */
export const environmentSeparationCheck: IntegrationCheck = {
  id: 'azure-environment-separation',
  name: 'Separation of environments — production isolated from non-production',
  description:
    'Verify production and non-production are separated across Azure subscriptions or resource groups.',
  service: 'policy',
  taskMapping: TASK_TEMPLATES.separationOfEnvironments,
  run: async (ctx: CheckContext) => {
    const subscriptionIds = await resolveAzureSubscriptionIds(ctx);
    // resolveAzureSubscriptionIds already emitted a finding when scope is empty.
    if (subscriptionIds.length === 0) return;

    // Tier 1 (strong): subscription-level separation. Read each IN-SCOPE
    // subscription's display name only — we never touch subscriptions outside
    // the configured selection.
    const subscriptionEnvSet = new Set<string>();
    let anySubscriptionReadFailed = false;
    for (const id of subscriptionIds) {
      try {
        const sub = await ctx.fetch<{ displayName?: string }>(
          `${ARM_BASE}/subscriptions/${id}?api-version=${SUBSCRIPTION_API_VERSION}`,
        );
        const env = classifyEnvironment([sub.displayName]);
        if (env) subscriptionEnvSet.add(env);
      } catch (err) {
        anySubscriptionReadFailed = true;
        ctx.log(
          `Azure env-separation: could not read subscription ${id} — ${toHttpReadFailure(err).error}`,
        );
      }
    }
    const subscriptionEnvs = [...subscriptionEnvSet];
    const subscriptionSeparationDetected = confirmsEnvironmentSeparation(subscriptionEnvs);
    if (!anySubscriptionReadFailed && subscriptionSeparationDetected) {
      ctx.pass({
        title: 'Environments separated across subscriptions',
        description: `Detected production separated from non-production across ${subscriptionIds.length} in-scope Azure subscription(s): ${subscriptionEnvs.join(', ')} (subscription-level boundary).`,
        resourceType: 'azure-environment-separation',
        resourceId: 'subscriptions',
        evidence: {
          boundary: 'subscription',
          detectedEnvironments: subscriptionEnvs,
          subscriptionsScanned: subscriptionIds.length,
        },
      });
      return;
    }

    // Tier 2 (weak, logical): resource-group-level separation within the
    // IN-SCOPE subscriptions only.
    const rgEnvSet = new Set<string>();
    const rgSamples: Array<{ name: string; environment: string }> = [];
    let anyRgReadFailed = false;
    let resourceGroupsScanned = 0;
    let resourceGroupsClassified = 0;
    const rgCoverageGaps = new Set<string>();
    const rgCoverageGapSubscriptions = new Set<string>();
    for (const id of subscriptionIds) {
      let resourceGroups: ResourceGroup[];
      try {
        const result = await armListAllWithCoverage<ResourceGroup>({
          ctx,
          url: `${ARM_BASE}/subscriptions/${id}/resourcegroups?api-version=${RESOURCE_GROUPS_API_VERSION}`,
        });
        resourceGroups = result.items;
        for (const gap of result.coverageGaps) {
          rgCoverageGaps.add(gap);
          rgCoverageGapSubscriptions.add(id);
        }
      } catch (err) {
        anyRgReadFailed = true;
        ctx.log(
          `Azure env-separation: could not list resource groups in ${id} — ${toHttpReadFailure(err).error}`,
        );
        continue;
      }
      for (const rg of resourceGroups) {
        resourceGroupsScanned++;
        const env = classifyResourceGroupEnv(rg);
        if (env) {
          rgEnvSet.add(env);
          resourceGroupsClassified++;
          if (rgSamples.length < 50) rgSamples.push({ name: rg.name, environment: env });
        }
      }
    }
    const resourceGroupEnvs = [...rgEnvSet];
    const resourceGroupCoverageIncomplete = rgCoverageGaps.size > 0;
    const resourceGroupSeparationDetected = confirmsEnvironmentSeparation(resourceGroupEnvs);
    if (
      !anySubscriptionReadFailed &&
      !resourceGroupCoverageIncomplete &&
      resourceGroupSeparationDetected
    ) {
      ctx.pass({
        title: 'Environments separated across resource groups',
        description: `Detected production separated from non-production across resource groups in ${subscriptionIds.length} in-scope subscription(s): ${resourceGroupEnvs.join(', ')}. Resource-group separation is logical — RGs share the subscription's access and network boundary — not full isolation.`,
        resourceType: 'azure-environment-separation',
        resourceId: 'resource-groups',
        evidence: {
          boundary: 'resource-group',
          detectedEnvironments: resourceGroupEnvs,
          subscriptionsScanned: subscriptionIds.length,
          resourceGroups: rgSamples,
        },
      });
      return;
    }

    // Could not confirm. A read failure or pagination gap in EITHER tier leaves
    // coverage incomplete, so the verdict is "could not verify"
    // (retry/permissions/scope) — not the confident "could not confirm" (a
    // complete scan that found no split).
    const detectedAll = [...new Set([...subscriptionEnvs, ...resourceGroupEnvs])];
    const coverageGaps: string[] = [];
    if (anySubscriptionReadFailed) coverageGaps.push('subscriptions could not be read');
    if (anyRgReadFailed) coverageGaps.push('resource groups could not be listed');
    if (resourceGroupCoverageIncomplete) {
      coverageGaps.push('resource-group pagination stopped before all groups were evaluated');
    }
    const coverageIncomplete = coverageGaps.length > 0;
    const separationDetected = subscriptionSeparationDetected || resourceGroupSeparationDetected;
    const unclassifiedResourceGroupCount = resourceGroupsScanned - resourceGroupsClassified;
    const unclassifiedDetail =
      unclassifiedResourceGroupCount > 0
        ? `; ${unclassifiedResourceGroupCount} resource group(s) were unclassified and need an environment tag or environment token in the name`
        : '';
    const base =
      detectedAll.length === 0
        ? `No in-scope Azure subscription or resource group could be classified by environment across ${subscriptionIds.length} subscription(s)`
        : separationDetected && coverageIncomplete
          ? `Detected production separated from non-production in the scanned Azure scope (${detectedAll.join(', ')}), but coverage is incomplete across ${subscriptionIds.length} in-scope subscription(s)`
          : `Detected environment(s) ${detectedAll.join(', ')}, but could not confirm a production environment separated from a non-production one across ${subscriptionIds.length} in-scope subscription(s)`;
    ctx.fail({
      title: coverageIncomplete
        ? 'Could not verify environment separation'
        : 'Could not confirm environment separation',
      description: `${base}${unclassifiedDetail}${coverageIncomplete ? ` (${coverageGaps.join('; ')})` : ''}.`,
      resourceType: 'azure-environment-separation',
      resourceId: 'subscriptions',
      severity: 'medium',
      remediation: GUIDANCE,
      evidence: {
        subscriptionEnvironments: subscriptionEnvs,
        resourceGroupEnvironments: resourceGroupEnvs,
        subscriptionsScanned: subscriptionIds.length,
        resourceGroupsScanned,
        resourceGroupsClassified,
        unclassifiedResourceGroupCount,
        ...(coverageIncomplete ? { coverageIncomplete: true } : {}),
        ...(resourceGroupCoverageIncomplete
          ? {
              resourceGroupCoverageGaps: [...rgCoverageGaps],
              resourceGroupCoverageGapSubscriptions: [...rgCoverageGapSubscriptions],
            }
          : {}),
      },
    });
  },
};
