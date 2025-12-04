import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  createGCPClients,
  listAlertingPolicies,
  listLogSinks,
  listNotificationChannels,
  type AlertingPolicy,
  type LogSink,
  type NotificationChannel,
} from '../helpers';
import type { GCPCredentials } from '../types';

/**
 * GCP Monitoring & Alerting Check
 *
 * Verifies that logging is enabled and alerting policies are configured
 * for deployment failures and other critical events.
 * Maps to: Monitoring & Alerting task
 */
export const monitoringAlertingCheck: IntegrationCheck = {
  id: 'monitoring-alerting',
  name: 'Monitoring & Alerting Review',
  description:
    'Verify logging is enabled and alerting policies are configured for deployments and failures',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,
  variables: [],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting GCP Monitoring & Alerting check');

    const credentials = ctx.credentials as unknown as GCPCredentials;

    let gcp;
    try {
      gcp = await createGCPClients(credentials, ctx.log);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ctx.fail({
        title: 'Failed to Connect to GCP',
        resourceType: 'connection',
        resourceId: 'gcp-auth',
        severity: 'critical',
        description: `Could not authenticate with GCP: ${errorMessage}`,
        remediation: 'Verify the service account key is valid and has the required permissions',
        evidence: { error: String(error) },
      });
      return;
    }

    const projectId = gcp.projectId;
    ctx.log(`Checking monitoring & alerting configuration for project: ${projectId}`);

    // Collect all data
    const allAlertingPolicies: AlertingPolicy[] = [];
    const allLogSinks: LogSink[] = [];
    const allNotificationChannels: NotificationChannel[] = [];
    const issues: string[] = [];

    // Fetch alerting policies
    ctx.log('Fetching alerting policies...');
    try {
      let pageToken: string | undefined;
      do {
        const response = await listAlertingPolicies(gcp.client, projectId, pageToken);
        if (response.alertPolicies) {
          allAlertingPolicies.push(...response.alertPolicies);
        }
        pageToken = response.nextPageToken;
      } while (pageToken);
      ctx.log(`Found ${allAlertingPolicies.length} alerting policies`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ctx.log(`Could not fetch alerting policies: ${errorMessage}`);
      issues.push(`Unable to fetch alerting policies: ${errorMessage}`);
    }

    // Fetch log sinks
    ctx.log('Fetching log sinks...');
    try {
      let pageToken: string | undefined;
      do {
        const response = await listLogSinks(gcp.client, projectId, pageToken);
        if (response.sinks) {
          allLogSinks.push(...response.sinks);
        }
        pageToken = response.nextPageToken;
      } while (pageToken);
      ctx.log(`Found ${allLogSinks.length} log sinks`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ctx.log(`Could not fetch log sinks: ${errorMessage}`);
      issues.push(`Unable to fetch log sinks: ${errorMessage}`);
    }

    // Fetch notification channels
    ctx.log('Fetching notification channels...');
    try {
      let pageToken: string | undefined;
      do {
        const response = await listNotificationChannels(gcp.client, projectId, pageToken);
        if (response.notificationChannels) {
          allNotificationChannels.push(...response.notificationChannels);
        }
        pageToken = response.nextPageToken;
      } while (pageToken);
      ctx.log(`Found ${allNotificationChannels.length} notification channels`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ctx.log(`Could not fetch notification channels: ${errorMessage}`);
    }

    // Analyze alerting policies
    const enabledPolicies = allAlertingPolicies.filter((p) => p.enabled);
    const disabledPolicies = allAlertingPolicies.filter((p) => !p.enabled);
    const policiesWithoutChannels = allAlertingPolicies.filter(
      (p) => p.enabled && (!p.notificationChannels || p.notificationChannels.length === 0),
    );

    // Look for deployment-related alerts
    const deploymentKeywords = [
      'deploy',
      'build',
      'release',
      'rollout',
      'cloud run',
      'gke',
      'app engine',
      'functions',
    ];
    const failureKeywords = ['fail', 'error', 'crash', 'down', 'unhealthy', 'timeout', 'exception'];

    const deploymentRelatedPolicies = allAlertingPolicies.filter((policy) => {
      const searchText = `${policy.displayName} ${JSON.stringify(policy.conditions)}`.toLowerCase();
      return deploymentKeywords.some((keyword) => searchText.includes(keyword));
    });

    const failureRelatedPolicies = allAlertingPolicies.filter((policy) => {
      const searchText = `${policy.displayName} ${JSON.stringify(policy.conditions)}`.toLowerCase();
      return failureKeywords.some((keyword) => searchText.includes(keyword));
    });

    // Analyze log sinks
    const enabledSinks = allLogSinks.filter((s) => !s.disabled);
    const auditLogSinks = allLogSinks.filter((s) => {
      const filter = (s.filter || '').toLowerCase();
      return filter.includes('audit') || filter.includes('activity') || !s.filter; // Default sink captures all
    });

    // Analyze notification channels
    const enabledChannels = allNotificationChannels.filter((c) => c.enabled);
    const channelTypes = new Set(enabledChannels.map((c) => c.type));

    // Build findings
    const hasLogging = enabledSinks.length > 0 || auditLogSinks.length > 0;
    const hasAlerting = enabledPolicies.length > 0;
    const hasNotificationChannels = enabledChannels.length > 0;
    const hasDeploymentAlerts = deploymentRelatedPolicies.length > 0;
    const hasFailureAlerts = failureRelatedPolicies.length > 0;

    // Report specific issues as failures
    if (!hasLogging) {
      ctx.fail({
        title: 'No Active Log Sinks Configured',
        resourceType: 'logging',
        resourceId: projectId,
        severity: 'high',
        description: 'No log sinks are configured to export logs. Audit logs may not be retained.',
        remediation:
          'Configure log sinks to export logs to Cloud Storage, BigQuery, or Pub/Sub for retention and analysis. Go to Cloud Console → Logging → Log Router.',
        evidence: {
          projectId,
          totalSinks: allLogSinks.length,
          enabledSinks: enabledSinks.length,
        },
      });
    }

    if (!hasAlerting) {
      ctx.fail({
        title: 'No Alerting Policies Configured',
        resourceType: 'monitoring',
        resourceId: projectId,
        severity: 'high',
        description: 'No alerting policies are configured. You will not be notified of issues.',
        remediation:
          'Configure alerting policies in Cloud Monitoring to be notified of deployment failures, errors, and other critical events. Go to Cloud Console → Monitoring → Alerting.',
        evidence: {
          projectId,
          totalPolicies: allAlertingPolicies.length,
        },
      });
    }

    if (hasAlerting && !hasNotificationChannels) {
      ctx.fail({
        title: 'No Notification Channels Configured',
        resourceType: 'monitoring',
        resourceId: projectId,
        severity: 'high',
        description:
          'Alerting policies exist but no notification channels are configured. Alerts will not be delivered.',
        remediation:
          'Configure notification channels (email, Slack, PagerDuty, etc.) in Cloud Monitoring and link them to your alerting policies.',
        evidence: {
          projectId,
          alertingPolicies: enabledPolicies.length,
          notificationChannels: allNotificationChannels.length,
        },
      });
    }

    if (policiesWithoutChannels.length > 0) {
      ctx.pass({
        title: 'Alerting Policies Missing Channels',
        resourceType: 'monitoring',
        resourceId: projectId,
        description: `${policiesWithoutChannels.length} alerting policies do not have notification channels. Alerts exist but delivery destinations still need to be added.`,
        evidence: {
          projectId,
          policiesWithoutChannels: policiesWithoutChannels.map((p) => ({
            name: p.displayName,
            enabled: p.enabled,
          })),
        },
      });
    }

    if (disabledPolicies.length > 0) {
      ctx.pass({
        title: 'Disabled Alerting Policies Detected',
        resourceType: 'monitoring',
        resourceId: projectId,
        description: `${disabledPolicies.length} alerting policies are present but disabled. Enable them if they should still produce alerts.`,
        evidence: {
          projectId,
          disabledPolicies: disabledPolicies.map((p) => p.displayName),
        },
      });
    }

    if (hasAlerting && (!hasDeploymentAlerts || !hasFailureAlerts)) {
      ctx.pass({
        title: 'General Alerts Enabled',
        resourceType: 'monitoring',
        resourceId: projectId,
        description:
          'Alerting is enabled. Consider adding deployment/failure specific policies for deeper coverage.',
        evidence: {
          projectId,
          totalPolicies: allAlertingPolicies.length,
          deploymentRelated: deploymentRelatedPolicies.length,
          failureRelated: failureRelatedPolicies.length,
        },
      });
    }

    // Always emit a pass with the full configuration summary
    ctx.pass({
      title: 'Monitoring & Alerting Configuration',
      resourceType: 'project',
      resourceId: projectId,
      description: `Project ${projectId}: ${enabledPolicies.length} active alerts, ${enabledSinks.length} log sinks, ${enabledChannels.length} notification channels`,
      evidence: {
        projectId,
        reviewedAt: new Date().toISOString(),
        summary: {
          hasLogging,
          hasAlerting,
          hasNotificationChannels,
          hasDeploymentAlerts,
          hasFailureAlerts,
        },
        alertingPolicies: {
          total: allAlertingPolicies.length,
          enabled: enabledPolicies.length,
          disabled: disabledPolicies.length,
          withoutChannels: policiesWithoutChannels.length,
          deploymentRelated: deploymentRelatedPolicies.length,
          failureRelated: failureRelatedPolicies.length,
          policies: allAlertingPolicies.map((p) => ({
            name: p.displayName,
            enabled: p.enabled,
            conditionCount: p.conditions?.length || 0,
            notificationChannelCount: p.notificationChannels?.length || 0,
          })),
        },
        logSinks: {
          total: allLogSinks.length,
          enabled: enabledSinks.length,
          auditRelated: auditLogSinks.length,
          sinks: allLogSinks.map((s) => ({
            name: s.name.split('/').pop(),
            destination: s.destination,
            disabled: s.disabled,
            hasFilter: !!s.filter,
          })),
        },
        notificationChannels: {
          total: allNotificationChannels.length,
          enabled: enabledChannels.length,
          types: Array.from(channelTypes),
          channels: enabledChannels.map((c) => ({
            name: c.displayName,
            type: c.type,
            enabled: c.enabled,
          })),
        },
      },
    });

    ctx.log('GCP Monitoring & Alerting check complete');
  },
};
