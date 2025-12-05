/**
 * Azure Monitoring & Alerting Check
 *
 * Verifies that Azure Monitor alerts and action groups are configured
 * for proper incident notification.
 * Maps to: Monitoring & Alerting task
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { getActionGroups, getAlertRules, getAzureAccessToken } from '../helpers';

export const monitoringAlertingCheck: IntegrationCheck = {
  id: 'monitoring-alerting',
  name: 'Azure Monitoring & Alerting Review',
  description: 'Verify Azure Monitor alerts and notification action groups are configured',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,
  defaultSeverity: 'medium',
  variables: [],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting Azure Monitoring & Alerting check');

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
        remediation: 'Verify the Service Principal credentials are correct',
        evidence: { error: String(error) },
      });
      return;
    }

    // Fetch action groups
    ctx.log('Fetching action groups...');
    let actionGroupCount = 0;
    let actionGroupsWithReceivers = 0;

    try {
      const actionGroups = await getActionGroups(accessToken, subscriptionId);
      actionGroupCount = actionGroups.length;

      ctx.log(`Found ${actionGroupCount} action groups`);

      if (actionGroupCount === 0) {
        ctx.fail({
          title: 'No Action Groups Configured',
          resourceType: 'monitoring',
          resourceId: subscriptionId,
          severity: 'high',
          description:
            'No Azure Monitor action groups are configured. Alerts will not trigger notifications.',
          remediation:
            'Create at least one action group with email or webhook receivers in Azure Monitor',
          evidence: { actionGroupCount: 0 },
        });
      } else {
        // Check which action groups have receivers
        for (const ag of actionGroups) {
          const hasReceivers =
            (ag.properties.emailReceivers?.length || 0) > 0 ||
            (ag.properties.webhookReceivers?.length || 0) > 0;

          if (hasReceivers && ag.properties.enabled) {
            actionGroupsWithReceivers++;
          }
        }

        if (actionGroupsWithReceivers === 0) {
          ctx.fail({
            title: 'Action Groups Have No Receivers',
            resourceType: 'monitoring',
            resourceId: subscriptionId,
            severity: 'medium',
            description: 'Action groups exist but none have email or webhook receivers configured.',
            remediation: 'Add email or webhook receivers to at least one action group',
            evidence: {
              totalActionGroups: actionGroupCount,
              actionGroupsWithReceivers: 0,
            },
          });
        } else {
          ctx.pass({
            title: 'Action Groups Configured',
            resourceType: 'monitoring',
            resourceId: subscriptionId,
            description: `${actionGroupsWithReceivers} action groups have notification receivers configured`,
            evidence: {
              totalActionGroups: actionGroupCount,
              actionGroupsWithReceivers,
              groups: actionGroups.map((ag) => ({
                name: ag.name,
                enabled: ag.properties.enabled,
                emailReceivers: ag.properties.emailReceivers?.length || 0,
                webhookReceivers: ag.properties.webhookReceivers?.length || 0,
              })),
            },
          });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      ctx.warn(`Failed to fetch action groups: ${error}`);

      if (errorMsg.includes('403') || errorMsg.includes('AuthorizationFailed')) {
        ctx.fail({
          title: 'Unable to access Action Groups',
          resourceType: 'monitoring',
          resourceId: subscriptionId,
          severity: 'medium',
          description:
            'The service principal does not have permission to read action groups. Ensure the Monitoring Reader role is assigned and has propagated (can take up to 15 minutes).',
          remediation:
            'Assign the "Monitoring Reader" role to your App Registration on the subscription, then wait 10-15 minutes for permissions to propagate.',
          evidence: { error: errorMsg },
        });
      }
    }

    // Fetch alert rules
    ctx.log('Fetching alert rules...');
    let enabledAlertCount = 0;
    let disabledAlertCount = 0;
    let alertsWithActions = 0;

    try {
      const alertRules = await getAlertRules(accessToken, subscriptionId);
      ctx.log(`Found ${alertRules.length} metric alert rules`);

      for (const rule of alertRules) {
        if (rule.properties.enabled) {
          enabledAlertCount++;
          if (rule.properties.actions?.actionGroups?.length) {
            alertsWithActions++;
          }
        } else {
          disabledAlertCount++;
        }
      }

      if (alertRules.length === 0) {
        ctx.fail({
          title: 'No Alert Rules Configured',
          resourceType: 'monitoring',
          resourceId: subscriptionId,
          severity: 'high',
          description: 'No Azure Monitor metric alert rules are configured in this subscription.',
          remediation: 'Create alert rules for critical metrics like CPU, memory, and error rates',
          evidence: { alertRuleCount: 0 },
        });
      } else if (enabledAlertCount === 0) {
        ctx.fail({
          title: 'All Alert Rules Disabled',
          resourceType: 'monitoring',
          resourceId: subscriptionId,
          severity: 'high',
          description: `Found ${alertRules.length} alert rules but all are disabled.`,
          remediation: 'Enable at least one alert rule to ensure monitoring is active',
          evidence: {
            totalRules: alertRules.length,
            enabledRules: 0,
            disabledRules: disabledAlertCount,
          },
        });
      } else if (alertsWithActions === 0) {
        ctx.pass({
          title: 'Alert Rules Missing Action Groups',
          resourceType: 'monitoring',
          resourceId: subscriptionId,
          description: `${enabledAlertCount} enabled alert rules, but none have action groups attached. Alerts will not trigger notifications.`,
          evidence: {
            totalRules: alertRules.length,
            enabledRules: enabledAlertCount,
            alertsWithActions: 0,
          },
        });
      } else {
        ctx.pass({
          title: 'Alert Rules Configured',
          resourceType: 'monitoring',
          resourceId: subscriptionId,
          description: `${enabledAlertCount} enabled alert rules, ${alertsWithActions} with action groups`,
          evidence: {
            totalRules: alertRules.length,
            enabledRules: enabledAlertCount,
            disabledRules: disabledAlertCount,
            alertsWithActions,
            rules: alertRules.slice(0, 10).map((r) => ({
              name: r.name,
              enabled: r.properties.enabled,
              severity: r.properties.severity,
              hasActions: (r.properties.actions?.actionGroups?.length || 0) > 0,
            })),
          },
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      ctx.warn(`Failed to fetch alert rules: ${error}`);

      if (errorMsg.includes('403') || errorMsg.includes('AuthorizationFailed')) {
        ctx.fail({
          title: 'Unable to access Alert Rules',
          resourceType: 'monitoring',
          resourceId: subscriptionId,
          severity: 'medium',
          description:
            'The service principal does not have permission to read alert rules. Ensure the Monitoring Reader role is assigned and has propagated (can take up to 15 minutes).',
          remediation:
            'Assign the "Monitoring Reader" role to your App Registration on the subscription, then wait 10-15 minutes for permissions to propagate.',
          evidence: { error: errorMsg },
        });
      }
    }

    ctx.log(
      `Azure Monitoring check complete: ${actionGroupCount} action groups, ${enabledAlertCount} enabled alerts`,
    );
  },
};
