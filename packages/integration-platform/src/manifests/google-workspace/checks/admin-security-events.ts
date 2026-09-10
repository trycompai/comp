import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  HIGH_RISK_SECURITY_EVENTS,
  describeActor,
  fetchAdminActivities,
  getEventParameter,
  isInsufficientScopeError,
  lookbackStartTime,
} from '../admin-audit-events';
import { adminAuditLookbackDaysVariable } from '../variables';
import type { GoogleWorkspaceActivity } from '../types';

const DEFAULT_LOOKBACK_DAYS = 30;

function parseLookbackDays(raw: unknown): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LOOKBACK_DAYS;
}

/**
 * Flag admin console changes that weaken the tenant's security posture.
 *
 * Distinct from `admin-privilege-changes`: that check is about *who holds
 * access*, this one is about *settings that protect the tenant* — 2SV
 * enforcement, API access, admin password reset. Both read the same audit
 * log, so they share the fetch helper and the lookback variable.
 */
export const adminSecurityEventsCheck: IntegrationCheck = {
  id: 'admin-security-events',
  name: 'Admin Security Setting Changes',
  description:
    'Detects Google Workspace admin console changes that weaken security posture, such as 2-Step Verification enforcement or API access settings',
  service: 'admin-audit',
  taskMapping: TASK_TEMPLATES.internalSecurityAudit,
  defaultSeverity: 'high',
  variables: [adminAuditLookbackDaysVariable],

  run: async (ctx: CheckContext) => {
    const lookbackDays = parseLookbackDays(ctx.variables[adminAuditLookbackDaysVariable.id]);
    const startTime = lookbackStartTime(lookbackDays);

    ctx.log(`Reviewing admin security setting changes since ${startTime} (${lookbackDays} days)`);

    let activities: GoogleWorkspaceActivity[];
    try {
      activities = await fetchAdminActivities({ ctx, startTime });
    } catch (error) {
      if (isInsufficientScopeError(error)) {
        ctx.fail({
          title: 'Admin audit log not accessible',
          description:
            'Comp could not read the Google Workspace admin audit log. The connection is missing the admin.reports.audit.readonly scope, or the authorizing account is not a super admin.',
          resourceType: 'connection',
          resourceId: ctx.connectionId,
          severity: 'medium',
          remediation:
            'Reconnect Google Workspace and approve the audit log permission, authorizing with a super admin account.',
          evidence: { startTime, lookbackDays },
        });
        return;
      }
      throw error;
    }

    ctx.log(`Fetched ${activities.length} admin activities`);

    let riskEventCount = 0;

    for (const activity of activities) {
      for (const event of activity.events ?? []) {
        const risk = HIGH_RISK_SECURITY_EVENTS.get(event.name);
        if (!risk) continue;

        riskEventCount += 1;

        const actor = describeActor(activity);
        const newValue =
          getEventParameter(event, 'NEW_VALUE') ?? getEventParameter(event, 'SETTING_NAME');

        ctx.fail({
          title: risk.summary,
          description: `${actor} triggered ${event.name}${newValue ? ` (new value: ${newValue})` : ''} at ${activity.id.time}.`,
          resourceType: 'admin_activity',
          resourceId: `${activity.id.time}:${event.name}`,
          severity: risk.severity,
          remediation: risk.remediation,
          evidence: {
            event: event.name,
            eventType: event.type,
            actor,
            occurredAt: activity.id.time,
            ipAddress: activity.ipAddress,
            newValue,
            oldValue: getEventParameter(event, 'OLD_VALUE'),
          },
        });
      }
    }

    if (riskEventCount === 0) {
      ctx.pass({
        title: 'No security-weakening admin changes detected',
        description: `No monitored admin console security settings were changed in the last ${lookbackDays} days.`,
        resourceType: 'connection',
        resourceId: ctx.connectionId,
        evidence: {
          startTime,
          lookbackDays,
          activitiesReviewed: activities.length,
          monitoredEvents: [...HIGH_RISK_SECURITY_EVENTS.keys()],
        },
      });
    }

    ctx.log(`Admin security event review complete (${riskEventCount} risk events)`);
  },
};
