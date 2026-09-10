import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  PRIVILEGE_CHANGE_EVENTS,
  SUPER_ADMIN_ROLE_NAMES,
  describeActor,
  fetchAdminActivities,
  getEventParameter,
  isInsufficientScopeError,
  lookbackStartTime,
} from '../admin-audit-events';
import {
  adminAuditApprovedActorsVariable,
  adminAuditLookbackDaysVariable,
} from '../variables';
import type { GoogleWorkspaceActivity, GoogleWorkspaceActivityEvent } from '../types';

const DEFAULT_LOOKBACK_DAYS = 30;

function parseLookbackDays(raw: unknown): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LOOKBACK_DAYS;
}

function parseApprovedActors(raw: unknown): Set<string> {
  const values = Array.isArray(raw) ? raw : typeof raw === 'string' && raw ? [raw] : [];
  return new Set(values.map((v) => String(v).trim().toLowerCase()).filter(Boolean));
}

/** A privilege grant touching the super admin role is materially riskier. */
function touchesSuperAdmin(event: GoogleWorkspaceActivityEvent): boolean {
  const roleName = getEventParameter(event, 'ROLE_NAME');
  return roleName ? SUPER_ADMIN_ROLE_NAMES.has(roleName) : false;
}

function buildEvidence(
  activity: GoogleWorkspaceActivity,
  event: GoogleWorkspaceActivityEvent,
): Record<string, unknown> {
  return {
    event: event.name,
    eventType: event.type,
    actor: describeActor(activity),
    occurredAt: activity.id.time,
    ipAddress: activity.ipAddress,
    roleName: getEventParameter(event, 'ROLE_NAME'),
    targetUser: getEventParameter(event, 'USER_EMAIL'),
    privilegeName: getEventParameter(event, 'PRIVILEGE_NAME'),
  };
}

/**
 * Surface admin privilege changes for review.
 *
 * Compliance framings (CMMC AC.L2-3.1.5, SOC 2 CC6.3) require that privileged
 * access changes are tracked and reviewed, not that they never happen — so an
 * unrecognized actor granting privilege is a finding to review, while a change
 * by an approved actor passes with the same evidence recorded.
 */
export const adminPrivilegeChangesCheck: IntegrationCheck = {
  id: 'admin-privilege-changes',
  name: 'Admin Privilege Changes Reviewed',
  description:
    'Reviews Google Workspace admin role and privilege changes so grants of administrative access are tracked and attributable',
  service: 'admin-audit',
  taskMapping: TASK_TEMPLATES.internalSecurityAudit,
  defaultSeverity: 'medium',
  variables: [adminAuditLookbackDaysVariable, adminAuditApprovedActorsVariable],

  run: async (ctx: CheckContext) => {
    const lookbackDays = parseLookbackDays(ctx.variables[adminAuditLookbackDaysVariable.id]);
    const approvedActors = parseApprovedActors(
      ctx.variables[adminAuditApprovedActorsVariable.id],
    );
    const startTime = lookbackStartTime(lookbackDays);

    ctx.log(`Reviewing admin privilege changes since ${startTime} (${lookbackDays} days)`);

    let activities: GoogleWorkspaceActivity[];
    try {
      activities = await fetchAdminActivities({ ctx, startTime });
    } catch (error) {
      if (isInsufficientScopeError(error)) {
        // Connections created before the audit scope was added cannot read the
        // Reports API. Report it as actionable rather than erroring the run.
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

    let privilegeChangeCount = 0;

    for (const activity of activities) {
      for (const event of activity.events ?? []) {
        if (!PRIVILEGE_CHANGE_EVENTS.has(event.name)) continue;

        privilegeChangeCount += 1;

        const actor = describeActor(activity);
        const target = getEventParameter(event, 'USER_EMAIL') ?? 'unknown target';
        const roleName = getEventParameter(event, 'ROLE_NAME');
        const isSuperAdminChange = touchesSuperAdmin(event);
        const resourceId = `${activity.id.time}:${event.name}:${target}`;
        const evidence = buildEvidence(activity, event);

        if (approvedActors.has(actor.toLowerCase())) {
          ctx.pass({
            title: 'Privilege change by approved admin',
            description: `${actor} performed ${event.name} on ${target}${roleName ? ` (role: ${roleName})` : ''}. Actor is on the approved list.`,
            resourceType: 'admin_activity',
            resourceId,
            evidence,
          });
          continue;
        }

        ctx.fail({
          title: isSuperAdminChange
            ? 'Super admin privilege change requires review'
            : 'Admin privilege change requires review',
          description: `${actor} performed ${event.name} on ${target}${roleName ? ` (role: ${roleName})` : ''} at ${activity.id.time}.`,
          resourceType: 'admin_activity',
          resourceId,
          severity: isSuperAdminChange ? 'high' : 'medium',
          remediation: isSuperAdminChange
            ? 'Confirm this super admin grant was authorized through your access request process. Revoke it in Admin Console > Account > Admin roles if it was not, and add the actor to Approved Admin Actors once verified.'
            : 'Confirm this privilege change was authorized. Revoke it in Admin Console > Account > Admin roles if it was not, and add the actor to Approved Admin Actors once verified.',
          evidence,
        });
      }
    }

    if (privilegeChangeCount === 0) {
      // No changes in the window is itself the evidence auditors want.
      ctx.pass({
        title: 'No admin privilege changes in review window',
        description: `No admin role or privilege changes were recorded in Google Workspace in the last ${lookbackDays} days.`,
        resourceType: 'connection',
        resourceId: ctx.connectionId,
        evidence: { startTime, lookbackDays, activitiesReviewed: activities.length },
      });
    }

    ctx.log(`Admin privilege change review complete (${privilegeChangeCount} changes)`);
  },
};
