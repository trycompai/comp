import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { failMapleRequest, listAll, requireMapleBaseUrl } from '../api';
import type {
  MapleAlertDestination,
  MapleAlertRule,
  MapleAlertSignalType,
  MapleService,
} from '../types';
import {
  environmentVariable,
  lookbackHoursVariable,
  parseEnvironment,
  parseLookbackHours,
} from '../variables';

/** Signals that measure whether a service is up and serving requests correctly */
const AVAILABILITY_SIGNALS: ReadonlySet<MapleAlertSignalType> = new Set([
  'error_rate',
  'p95_latency',
  'p99_latency',
  'apdex',
  'throughput',
]);

/**
 * Maple App Availability Check
 *
 * Verifies that services are sending telemetry and that each one is covered by an
 * enabled, routed availability alert (error rate, latency, Apdex, or throughput).
 * Maps to: App Availability task
 */
export const appAvailabilityCheck: IntegrationCheck = {
  id: 'app-availability',
  name: 'Services Have Availability Alerts',
  description:
    'Verify services are reporting telemetry and each one is covered by an error rate, latency, Apdex, or throughput alert',
  service: 'availability',
  taskMapping: TASK_TEMPLATES.appAvailability,
  defaultSeverity: 'medium',
  variables: [environmentVariable, lookbackHoursVariable],

  run: async (ctx: CheckContext) => {
    const baseUrl = requireMapleBaseUrl(ctx);
    if (!baseUrl) return;

    const environment = parseEnvironment(ctx.variables);
    const lookbackHours = parseLookbackHours(ctx.variables);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - lookbackHours * 3_600_000);

    ctx.log(
      `Fetching services active in the last ${lookbackHours}h${environment ? ` in "${environment}"` : ''}`,
    );
    let services: MapleService[];
    try {
      services = await listAll<MapleService>(ctx, {
        baseUrl,
        path: '/v2/services',
        params: {
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          ...(environment ? { deployment_environment: environment } : {}),
        },
      });
    } catch (error) {
      failMapleRequest(ctx, { error, resource: 'services', scope: 'services:read' });
      return;
    }

    if (services.length === 0) {
      ctx.fail({
        title: 'No services reporting telemetry',
        resourceType: 'maple',
        resourceId: 'services',
        severity: 'high',
        description: `Maple received no traces from any service${environment ? ` in "${environment}"` : ''} in the last ${lookbackHours} hours, so availability is not being measured.`,
        remediation: environment
          ? `Confirm your services set deployment.environment="${environment}", or change the Environment setting on this check.`
          : 'Instrument your services with OpenTelemetry and send traces to Maple (see https://maple.dev/docs).',
        evidence: { environment, lookbackHours },
      });
      return;
    }

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

    const enabledDestinationIds = new Set(destinations.filter((d) => d.enabled).map((d) => d.id));
    const availabilityRules = rules.filter(
      (rule) =>
        rule.enabled &&
        AVAILABILITY_SIGNALS.has(rule.signal_type) &&
        rule.destination_ids.some((id) => enabledDestinationIds.has(id)),
    );
    ctx.log(
      `${services.length} services reporting, ${availabilityRules.length} routed availability rules`,
    );

    for (const service of services) {
      const covering = availabilityRules.filter((rule) => ruleCoversService(rule, service));
      const evidence = {
        service: service.name,
        environments: service.deployment_environments,
        spanCount: service.span_count,
        errorRate: service.error_rate,
        p95LatencyMs: service.p95_latency_ms,
        coveringRules: covering.map((rule) => ({
          id: rule.id,
          name: rule.name,
          signalType: rule.signal_type,
        })),
      };

      if (covering.length === 0) {
        ctx.fail({
          title: `"${service.name}" has no availability alert`,
          resourceType: 'service',
          resourceId: service.name,
          severity: 'medium',
          description:
            'This service is sending telemetry, but no enabled error rate, latency, Apdex, or throughput rule with a destination covers it.',
          remediation: `In Maple, open Alerts → Rules and create an error rate or latency rule that includes "${service.name}" (or applies to all services) and notifies an enabled destination.`,
          evidence,
        });
        continue;
      }

      ctx.pass({
        title: `"${service.name}" is monitored for availability`,
        resourceType: 'service',
        resourceId: service.name,
        description: `Covered by ${covering.map((rule) => rule.name).join(', ')}.`,
        evidence,
      });
    }
  },
};

function ruleCoversService(rule: MapleAlertRule, service: MapleService): boolean {
  if (rule.exclude_service_names.includes(service.name)) return false;
  if (rule.service_names.length > 0 && !rule.service_names.includes(service.name)) return false;
  if (rule.environments.length === 0) return true;
  return rule.environments.some((env) => service.deployment_environments.includes(env));
}
