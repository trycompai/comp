/**
 * Azure Security Findings Check
 *
 * Fetches and reports security alerts and assessments from Microsoft Defender for Cloud.
 * Maps to: Vulnerability & Patch Management task
 */

import type { CheckContext, FindingSeverity, IntegrationCheck } from '../../../types';
import { getAzureAccessToken, getSecurityAlerts, getSecurityAssessments } from '../helpers';

const severityMap: Record<string, FindingSeverity> = {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
  Informational: 'info',
};

export const securityFindingsCheck: IntegrationCheck = {
  id: 'security-findings',
  name: 'Microsoft Defender Security Findings',
  description: 'Review security alerts and assessments from Microsoft Defender for Cloud',
  defaultSeverity: 'high',
  variables: [],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Azure Security Findings check');

    const { tenantId, clientId, clientSecret, subscriptionId } = ctx.credentials;

    if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
      ctx.fail({
        title: 'Missing Azure credentials',
        resourceType: 'azure-config',
        resourceId: 'credentials',
        severity: 'critical',
        description: 'Azure credentials are not properly configured',
        remediation: 'Reconnect Azure with valid Service Principal credentials',
        evidence: {},
      });
      return;
    }

    let accessToken: string;
    try {
      accessToken = await getAzureAccessToken({
        tenantId,
        clientId,
        clientSecret,
        subscriptionId,
      });
    } catch (error) {
      ctx.fail({
        title: 'Azure authentication failed',
        resourceType: 'azure-auth',
        resourceId: subscriptionId,
        severity: 'critical',
        description: `Failed to authenticate with Azure: ${error instanceof Error ? error.message : String(error)}`,
        remediation: 'Verify the Service Principal credentials are correct and have not expired',
        evidence: { error: String(error) },
      });
      return;
    }

    // Fetch security alerts
    ctx.log('Fetching security alerts from Microsoft Defender for Cloud...');
    let alertCount = 0;

    try {
      const alerts = await getSecurityAlerts(accessToken, subscriptionId);
      const activeAlerts = alerts.filter((a) => a.properties.status === 'Active');

      ctx.log(`Found ${activeAlerts.length} active security alerts`);

      for (const alert of activeAlerts) {
        alertCount++;
        const severity = severityMap[alert.properties.severity] || 'medium';

        ctx.fail({
          title: alert.properties.alertDisplayName,
          resourceType: 'security-alert',
          resourceId: alert.name,
          severity,
          description: alert.properties.description,
          remediation:
            alert.properties.remediationSteps?.join('\n') ||
            'Review the alert in Microsoft Defender for Cloud and follow recommended actions',
          evidence: {
            alertType: alert.properties.alertType,
            compromisedEntity: alert.properties.compromisedEntity,
            intent: alert.properties.intent,
            startTime: alert.properties.startTimeUtc,
            resourceIdentifiers: alert.properties.resourceIdentifiers,
          },
        });
      }

      if (activeAlerts.length === 0) {
        ctx.pass({
          title: 'No active security alerts',
          resourceType: 'security-alerts',
          resourceId: subscriptionId,
          description: 'Microsoft Defender for Cloud has no active security alerts',
          evidence: { totalAlerts: alerts.length, activeAlerts: 0 },
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      ctx.warn(`Failed to fetch security alerts: ${error}`);

      // Report permission error as a finding so it's visible in the UI
      if (errorMsg.includes('403') || errorMsg.includes('AuthorizationFailed')) {
        ctx.fail({
          title: 'Unable to access Security Alerts',
          resourceType: 'security-alerts',
          resourceId: subscriptionId,
          severity: 'medium',
          description:
            'The service principal does not have permission to read security alerts. Ensure the Security Reader role is assigned and has propagated (can take up to 15 minutes).',
          remediation:
            'Assign the "Security Reader" role to your App Registration on the subscription, then wait 10-15 minutes for permissions to propagate.',
          evidence: { error: errorMsg },
        });
      }
    }

    // Fetch security assessments (recommendations)
    ctx.log('Fetching security assessments...');
    let unhealthyCount = 0;
    let healthyCount = 0;

    try {
      const assessments = await getSecurityAssessments(accessToken, subscriptionId);
      const unhealthy = assessments.filter((a) => a.properties.status.code === 'Unhealthy');
      const healthy = assessments.filter((a) => a.properties.status.code === 'Healthy');

      ctx.log(`Found ${unhealthy.length} unhealthy and ${healthy.length} healthy assessments`);

      // Report unhealthy assessments as findings (limit to top 50 to avoid overwhelming)
      for (const assessment of unhealthy.slice(0, 50)) {
        unhealthyCount++;
        const severity =
          severityMap[assessment.properties.metadata?.severity || 'Medium'] || 'medium';

        ctx.fail({
          title: assessment.properties.displayName,
          resourceType: 'security-assessment',
          resourceId: assessment.name,
          severity,
          description:
            assessment.properties.metadata?.description ||
            assessment.properties.status.description ||
            'Security assessment failed',
          remediation:
            assessment.properties.metadata?.remediationDescription ||
            'Review and remediate in Microsoft Defender for Cloud',
          evidence: {
            status: assessment.properties.status,
            category: assessment.properties.metadata?.category,
            resourceDetails: assessment.properties.resourceDetails,
          },
        });
      }

      healthyCount = healthy.length;

      if (unhealthy.length === 0) {
        ctx.pass({
          title: 'All security assessments passing',
          resourceType: 'security-assessments',
          resourceId: subscriptionId,
          description: 'All Microsoft Defender for Cloud assessments are healthy',
          evidence: { healthyCount: healthy.length },
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      ctx.warn(`Failed to fetch security assessments: ${error}`);

      // Report permission error as a finding so it's visible in the UI
      if (errorMsg.includes('403') || errorMsg.includes('AuthorizationFailed')) {
        ctx.fail({
          title: 'Unable to access Security Assessments',
          resourceType: 'security-assessments',
          resourceId: subscriptionId,
          severity: 'medium',
          description:
            'The service principal does not have permission to read security assessments. Ensure the Security Reader role is assigned and has propagated (can take up to 15 minutes).',
          remediation:
            'Assign the "Security Reader" role to your App Registration on the subscription, then wait 10-15 minutes for permissions to propagate.',
          evidence: { error: errorMsg },
        });
      }
    }

    ctx.log(
      `Azure Security Findings check complete: ${alertCount} alerts, ${unhealthyCount} unhealthy assessments, ${healthyCount} healthy`,
    );
  },
};
