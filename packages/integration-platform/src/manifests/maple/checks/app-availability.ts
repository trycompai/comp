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
 * Verifies that services are sending telemetry and that at least one enabled, routed
 * availability alert (error rate, latency, Apdex, or throughput) exists. Per-service
 * coverage is recorded as evidence.
 * Maps to: App Availability task
 */
export const appAvailabilityCheck: IntegrationCheck = {
  id: 'app-availability',
  name: 'Services Have Availability Alerts',
  description:
    'Verify services are reporting telemetry and an error rate, latency, Apdex, or throughput alert notifies your team',
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

    const coverage = services.map((service) => ({
      service: service.name,
      environments: service.deployment_environments,
      spanCount: service.span_count,
      errorRate: service.error_rate,
      p95LatencyMs: service.p95_latency_ms,
      coveringRules: availabilityRules
        .filter((rule) => ruleCoversService(rule, service))
        .map((rule) => rule.name),
    }));
    const uncovered = coverage.filter((c) => c.coveringRules.length === 0).map((c) => c.service);
    const evidence = {
      environment,
      lookbackHours,
      availabilityRules: availabilityRules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        signalType: rule.signal_type,
        services: rule.service_names.length > 0 ? rule.service_names : 'all',
      })),
      uncoveredServices: uncovered,
      services: coverage,
    };

    // Coverage is judged org-wide: one routed availability rule is enough. Per-service
    // gaps stay in the evidence, since not every service warrants its own alert.
    if (availabilityRules.length === 0) {
      ctx.fail({
        title: 'No availability alerts',
        resourceType: 'maple',
        resourceId: 'availability-alerts',
        severity: 'high',
        description: `${services.length} services are sending telemetry, but no enabled error rate, latency, Apdex, or throughput rule notifies an enabled destination.`,
        remediation:
          'In Maple, open Alerts → Rules and create an error rate or latency rule for your services that notifies an enabled destination.',
        evidence,
      });
      return;
    }

    ctx.pass({
      title: 'Services are monitored for availability',
      resourceType: 'maple',
      resourceId: 'availability-alerts',
      description: `${services.length - uncovered.length}/${services.length} services covered by ${availabilityRules.length} availability rule${availabilityRules.length === 1 ? '' : 's'}.`,
      evidence,
    });
  },
};

function ruleCoversService(rule: MapleAlertRule, service: MapleService): boolean {
  if (rule.exclude_service_names.includes(service.name)) return false;
  if (rule.service_names.length > 0 && !rule.service_names.includes(service.name)) return false;
  if (rule.environments.length === 0) return true;
  return rule.environments.some((env) => service.deployment_environments.includes(env));
}
