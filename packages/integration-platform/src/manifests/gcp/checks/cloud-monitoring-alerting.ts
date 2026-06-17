import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  remediationForReadFailure,
  toHttpReadFailure,
} from '../../http-read-failure';
import { gcpListItems, isGcpApiDisabled, resolveGcpProjectIds } from './shared';

interface AlertPolicy {
  name: string;
  displayName?: string;
  /** Defaults to enabled when unset (per Cloud Monitoring API). */
  enabled?: boolean;
  notificationChannels?: string[];
}

interface LogSink {
  name: string;
  destination?: string;
  disabled?: boolean;
}

// Every project has two managed sinks (`_Required`, `_Default`) writing to the
// project's `_Default` log bucket. They are present by default and are NOT
// evidence that the customer configured durable log routing/retention.
const DEFAULT_SINK_NAMES = new Set(['_Required', '_Default']);

/**
 * A sink only proves durable log retention/export when it writes OUTSIDE the
 * default in-project log bucket: to BigQuery, Cloud Storage, Pub/Sub, or a
 * dedicated (non-default) Cloud Logging bucket. Keying off the DESTINATION (not
 * just the sink name) prevents a custom-named sink that still targets the
 * `_Default`/`_Required` bucket from being mistaken for durable export.
 */
function isDurableExportDestination(destination: string | undefined): boolean {
  if (!destination) return false;
  if (
    destination.startsWith('bigquery.googleapis.com/') ||
    destination.startsWith('storage.googleapis.com/') ||
    destination.startsWith('pubsub.googleapis.com/')
  ) {
    return true;
  }
  // Cloud Logging bucket destination — durable only when it is NOT the managed
  // `_Default`/`_Required` bucket (those hold default in-project retention).
  const bucket = destination.match(/\/buckets\/([^/]+)$/)?.[1];
  if (bucket) return !DEFAULT_SINK_NAMES.has(bucket);
  // Unknown/unsupported destination shape — be conservative and don't count it.
  return false;
}

/**
 * Per-project alerting prong: at least one enabled alert policy must be wired to
 * a notification channel, otherwise alerts fire into the void. Mirrors the
 * Azure Monitor check's "activity log alerts" half.
 */
async function evaluateAlerting(
  ctx: CheckContext,
  projectId: string,
): Promise<void> {
  let policies: AlertPolicy[];
  try {
    policies = await gcpListItems<AlertPolicy>(
      ctx,
      `https://monitoring.googleapis.com/v3/projects/${encodeURIComponent(projectId)}/alertPolicies`,
      'alertPolicies',
    );
  } catch (err) {
    // Monitoring API not enabled on this project — no alerting exists to
    // evaluate here. Skip like a zero-resource project rather than emit a
    // false "grant permission" finding (consistent with the other GCP checks).
    if (isGcpApiDisabled(err)) {
      ctx.log(
        `GCP Cloud Monitoring: API not enabled in project "${projectId}" — skipping alerting`,
      );
      return;
    }
    const failure = toHttpReadFailure(err);
    ctx.fail({
      title: `Could not verify alerting: ${projectId}`,
      description: `Alert policies for project "${projectId}" could not be listed (${failure.error}), so alerting is unverified.`,
      resourceType: 'gcp-project',
      resourceId: projectId,
      severity: 'medium',
      remediation: remediationForReadFailure(
        failure,
        'Grant monitoring.alertPolicies.list (e.g. roles/monitoring.viewer) to the connection for this project, then re-run.',
      ),
      evidence: { projectId, error: failure.error },
    });
    return;
  }

  // enabled defaults to true when unset; a policy only "notifies" if it targets
  // at least one notification channel.
  const active = policies.filter(
    (p) => p.enabled !== false && (p.notificationChannels?.length ?? 0) > 0,
  );

  if (active.length > 0) {
    ctx.pass({
      title: `Alerting configured: ${projectId}`,
      description: `Project "${projectId}" has ${active.length} enabled alert ${active.length === 1 ? 'policy' : 'policies'} wired to a notification channel.`,
      resourceType: 'gcp-project',
      resourceId: projectId,
      evidence: {
        projectId,
        enabledPoliciesWithChannel: active.length,
        totalPolicies: policies.length,
        samplePolicies: active
          .slice(0, 5)
          .map((p) => p.displayName ?? p.name),
      },
    });
    return;
  }

  ctx.fail({
    title: `No alerting configured: ${projectId}`,
    description:
      policies.length === 0
        ? `Project "${projectId}" has no Cloud Monitoring alert policies.`
        : `Project "${projectId}" has alert policies, but none are enabled with a notification channel, so no alerts reach anyone.`,
    resourceType: 'gcp-project',
    resourceId: projectId,
    severity: 'medium',
    remediation:
      'Create a Cloud Monitoring alert policy and attach a notification channel (email, Slack, PagerDuty, etc.) so incidents are surfaced.',
    evidence: {
      projectId,
      totalPolicies: policies.length,
      enabledPoliciesWithChannel: 0,
    },
  });
}

/**
 * Per-project log-export prong: at least one operator-configured, enabled log
 * sink must route logs to durable storage (BigQuery / Cloud Storage / Pub/Sub
 * or a non-default log bucket). Mirrors the Azure Monitor check's "diagnostic
 * log export" half. GCP always captures logs short-term, so the meaningful
 * control is durable export/retention beyond the managed `_Default` sink.
 */
async function evaluateLogExport(
  ctx: CheckContext,
  projectId: string,
): Promise<void> {
  let sinks: LogSink[];
  try {
    sinks = await gcpListItems<LogSink>(
      ctx,
      `https://logging.googleapis.com/v2/projects/${encodeURIComponent(projectId)}/sinks`,
      'sinks',
    );
  } catch (err) {
    if (isGcpApiDisabled(err)) {
      ctx.log(
        `GCP Cloud Logging: API not enabled in project "${projectId}" — skipping log export`,
      );
      return;
    }
    const failure = toHttpReadFailure(err);
    ctx.fail({
      title: `Could not verify log export: ${projectId}`,
      description: `Log sinks for project "${projectId}" could not be listed (${failure.error}), so log export is unverified.`,
      resourceType: 'gcp-project',
      resourceId: projectId,
      severity: 'medium',
      remediation: remediationForReadFailure(
        failure,
        'Grant logging.sinks.list (e.g. roles/logging.viewer) to the connection for this project, then re-run.',
      ),
      evidence: { projectId, error: failure.error },
    });
    return;
  }

  const exportSinks = sinks.filter(
    (s) =>
      s.disabled !== true &&
      !DEFAULT_SINK_NAMES.has(s.name) &&
      isDurableExportDestination(s.destination),
  );

  if (exportSinks.length > 0) {
    ctx.pass({
      title: `Log export configured: ${projectId}`,
      description: `Project "${projectId}" routes logs to ${exportSinks.length} configured sink ${exportSinks.length === 1 ? 'destination' : 'destinations'} for durable retention.`,
      resourceType: 'gcp-project',
      resourceId: projectId,
      evidence: {
        projectId,
        exportSinks: exportSinks.length,
        destinations: exportSinks
          .slice(0, 5)
          .map((s) => s.destination ?? s.name),
      },
    });
    return;
  }

  ctx.fail({
    title: `No log export configured: ${projectId}`,
    description: `Project "${projectId}" has no enabled log sink exporting logs beyond the default in-project retention.`,
    resourceType: 'gcp-project',
    resourceId: projectId,
    severity: 'medium',
    remediation:
      'Create a log sink that exports logs to BigQuery, Cloud Storage, Pub/Sub, or a dedicated log bucket with extended retention.',
    evidence: {
      projectId,
      // Total includes the managed `_Default`/`_Required` sinks, which do not
      // count as durable export.
      sinksFound: sinks.length,
      exportSinks: 0,
    },
  });
}

/**
 * Cloud Monitoring & Alerting check (direct API, no SCC). Two prongs per
 * project — alert policies wired to a notification channel, and durable log
 * export via a configured sink — mirroring the AWS CloudTrail and Azure Monitor
 * checks that share the "Monitoring & Alerting" task. An unreadable prong fails
 * "could not verify" rather than silently passing the shared task.
 */
export const cloudMonitoringAlertingCheck: IntegrationCheck = {
  id: 'gcp-cloud-monitoring-alerting',
  name: 'Cloud Monitoring — alerting and log export',
  description:
    'Verify alert policies notify a channel and logs are exported to durable storage.',
  service: 'cloud-monitoring',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,

  run: async (ctx: CheckContext) => {
    const projectIds = await resolveGcpProjectIds(ctx);
    if (projectIds.length === 0) {
      ctx.log('GCP Cloud Monitoring check: no projects resolved — skipping');
      return;
    }

    for (const projectId of projectIds) {
      await evaluateAlerting(ctx, projectId);
      await evaluateLogExport(ctx, projectId);
    }
  },
};
