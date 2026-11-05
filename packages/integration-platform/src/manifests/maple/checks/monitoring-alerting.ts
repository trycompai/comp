import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { failMapleRequest, listAll, requireMapleBaseUrl } from '../api';
import type { MapleAlertDestination, MapleAlertRule } from '../types';

/**
 * Maple Monitoring & Alerting Check
 *
 * Verifies that alert rules are enabled, evaluating without errors, and routed
 * to at least one enabled notification destination.
 * Maps to: Monitoring & Alerting task
 */
export const monitoringAlertingCheck: IntegrationCheck = {
  id: 'monitoring-alerting',
  name: 'Alert Rules Route to a Destination',
  description:
    'Verify enabled alert rules exist, evaluate without errors, and notify at least one enabled destination',
  service: 'alerting',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,
  defaultSeverity: 'high',

  run: async (ctx: CheckContext) => {
    const baseUrl = requireMapleBaseUrl(ctx);
    if (!baseUrl) return;

    ctx.log('Fetching Maple alert rules and destinations');
    let rules: MapleAlertRule[];
    let destinations: MapleAlertDestination[];
    try {
      [rules, destinations] = await Promise.all([
        listAll<MapleAlertRule>(ctx, { baseUrl, path: '/v2/alerts/rules' }),
        listAll<MapleAlertDestination>(ctx, { baseUrl, path: '/v2/alerts/destinations' }),
      ]);
    } catch (error) {
      failMapleRequest(ctx, { error, resource: 'alert rules', scope: 'alerts:read' });
      return;
    }

    const enabledRules = rules.filter((rule) => rule.enabled);
    const enabledDestinations = new Map(
      destinations.filter((d) => d.enabled).map((d) => [d.id, d] as const),
    );
    ctx.log(
      `Found ${enabledRules.length}/${rules.length} enabled rules and ${enabledDestinations.size}/${destinations.length} enabled destinations`,
    );

    if (enabledDestinations.size === 0) {
      ctx.fail({
        title: 'No enabled alert destinations',
        resourceType: 'maple',
        resourceId: 'alert-destinations',
        severity: 'high',
        description:
          'Maple has no enabled destination (email, Slack, PagerDuty, webhook, ...) to send alerts to, so no one is notified when an alert fires.',
        remediation:
          'In Maple, open Alerts → Destinations, add a destination your on-call team watches, and send a test notification.',
        evidence: { destinations: destinations.map(summarizeDestination) },
      });
    }

    if (enabledRules.length === 0) {
      ctx.fail({
        title: 'No enabled alert rules',
        resourceType: 'maple',
        resourceId: 'alert-rules',
        severity: 'high',
        description: 'Maple has no enabled alert rules, so production issues do not raise alerts.',
        remediation:
          'In Maple, open Alerts → Rules and create at least an error rate and a latency rule for your production services.',
        evidence: { totalRules: rules.length },
      });
      return;
    }

    for (const rule of enabledRules) {
      const routedTo = rule.destination_ids.flatMap((id) => {
        const destination = enabledDestinations.get(id);
        return destination ? [summarizeDestination(destination)] : [];
      });
      const evidence = { rule: summarizeRule(rule), destinations: routedTo };

      if (routedTo.length === 0) {
        ctx.fail({
          title: `Alert rule "${rule.name}" notifies no one`,
          resourceType: 'alert_rule',
          resourceId: rule.id,
          severity: 'medium',
          description:
            rule.destination_ids.length === 0
              ? 'This rule has no destinations, so it fires silently.'
              : 'Every destination on this rule is disabled or deleted, so it fires silently.',
          remediation: `In Maple, open Alerts → Rules → "${rule.name}" and add an enabled destination.`,
          evidence,
        });
        continue;
      }

      if (rule.last_evaluation_error) {
        ctx.fail({
          title: `Alert rule "${rule.name}" fails to evaluate`,
          resourceType: 'alert_rule',
          resourceId: rule.id,
          severity: 'medium',
          description:
            'The last evaluation of this rule failed, so it cannot fire until the error is fixed.',
          remediation: `In Maple, open Alerts → Rules → "${rule.name}", review the evaluation error, and correct the query or filters.`,
          evidence: { ...evidence, lastEvaluationError: rule.last_evaluation_error },
        });
        continue;
      }

      ctx.pass({
        title: `Alert rule "${rule.name}" is active and routed`,
        resourceType: 'alert_rule',
        resourceId: rule.id,
        description: `${rule.signal_type} rule notifies ${routedTo.map((d) => d.name).join(', ')}.`,
        evidence,
      });
    }

    ctx.pass({
      title: 'Maple alerting configuration',
      resourceType: 'maple',
      resourceId: 'alerting-summary',
      description: `${enabledRules.length} enabled rules, ${enabledDestinations.size} enabled destinations.`,
      evidence: {
        reviewedAt: new Date().toISOString(),
        rules: rules.map(summarizeRule),
        destinations: destinations.map(summarizeDestination),
      },
    });
  },
};

const summarizeRule = (rule: MapleAlertRule) => ({
  id: rule.id,
  name: rule.name,
  enabled: rule.enabled,
  severity: rule.severity,
  signalType: rule.signal_type,
  condition: `${rule.comparator} ${rule.threshold} over ${rule.window_minutes}m`,
  services: rule.service_names.length > 0 ? rule.service_names : 'all',
  environments: rule.environments.length > 0 ? rule.environments : 'all',
  lastEvaluatedAt: rule.last_evaluated_at,
});

const summarizeDestination = (destination: MapleAlertDestination) => ({
  id: destination.id,
  name: destination.name,
  type: destination.type,
  enabled: destination.enabled,
  lastTestedAt: destination.last_tested_at,
});
