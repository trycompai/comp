import type { CheckContext } from '../../types';
import type {
  GoogleWorkspaceActivitiesResponse,
  GoogleWorkspaceActivity,
  GoogleWorkspaceActivityEvent,
} from './types';

/** Reports API lives under a different path prefix than the Directory API. */
const ADMIN_ACTIVITY_PATH = '/admin/reports/v1/activity/users/all/applications/admin';

/** Google caps Reports API page size at 1000. */
const MAX_PAGE_SIZE = '1000';

/** Stop paging runaway histories rather than hanging a check run. */
const MAX_PAGES = 20;

/**
 * Admin console events that grant, revoke, or redefine privilege.
 *
 * Names come from Google's "Admin audit activity events" for the `admin`
 * application. Unknown names are ignored rather than guessed at, so a
 * rename upstream degrades to "no events found" rather than a wrong verdict.
 */
export const PRIVILEGE_CHANGE_EVENTS: ReadonlySet<string> = new Set([
  'ASSIGN_ROLE',
  'UNASSIGN_ROLE',
  'CREATE_ROLE',
  'DELETE_ROLE',
  'RENAME_ROLE',
  'UPDATE_ROLE',
  'ADD_PRIVILEGE',
  'REMOVE_PRIVILEGE',
  'GRANT_ADMIN_PRIVILEGE',
  'REVOKE_ADMIN_PRIVILEGE',
  'GRANT_DELEGATED_ADMIN_PRIVILEGES',
  'REVOKE_DELEGATED_ADMIN_PRIVILEGES',
]);

/**
 * Admin actions that weaken the security posture of the tenant. Each carries
 * the severity to report and the remediation an admin should follow.
 */
export const HIGH_RISK_SECURITY_EVENTS: ReadonlyMap<
  string,
  { severity: 'critical' | 'high' | 'medium'; summary: string; remediation: string }
> = new Map([
  ['ENFORCE_STRONG_AUTHENTICATION', {
    severity: 'high',
    summary: '2-Step Verification enforcement was changed',
    remediation:
      'Confirm the change was intentional. Re-enable 2SV enforcement in Admin Console > Security > Authentication > 2-Step Verification.',
  }],
  ['ALLOW_STRONG_AUTHENTICATION', {
    severity: 'medium',
    summary: '2-Step Verification availability was changed',
    remediation: 'Verify the change was approved and that 2SV remains available to all users.',
  }],
  ['TOGGLE_ALLOW_ADMIN_PASSWORD_RESET', {
    severity: 'medium',
    summary: 'Admin password-reset setting was changed',
    remediation: 'Review whether admins should be able to reset user passwords in this tenant.',
  }],
  ['CHANGE_TWO_STEP_VERIFICATION_ENROLLMENT_PERIOD_DURATION', {
    severity: 'medium',
    summary: '2SV enrollment grace period was changed',
    remediation: 'Confirm the grace period still meets policy; shorten it if it was extended without approval.',
  }],
  ['TOGGLE_AUTOMATIC_CONTACT_SHARING', {
    severity: 'medium',
    summary: 'Automatic contact sharing was toggled',
    remediation: 'Verify the directory sharing change was approved.',
  }],
  ['REVOKE_ADMIN_PRIVILEGE', {
    severity: 'medium',
    summary: 'Admin privilege was revoked',
    remediation: 'Confirm the revocation was intended and that no required admin coverage was lost.',
  }],
  ['TOGGLE_ENABLE_OAUTH2_ACCESS', {
    severity: 'high',
    summary: 'OAuth 2.0 API access setting was changed',
    remediation: 'Review third-party API access settings in Admin Console > Security > API controls.',
  }],
]);

/** Role names Google uses for the built-in super administrator role. */
export const SUPER_ADMIN_ROLE_NAMES: ReadonlySet<string> = new Set([
  '_SEED_ADMIN_ROLE',
  'Super Admin',
  '_SUPER_ADMIN_ROLE',
]);

/** Read a named parameter off an activity event. */
export function getEventParameter(
  event: GoogleWorkspaceActivityEvent,
  name: string,
): string | undefined {
  const param = event.parameters?.find((p) => p.name === name);
  if (!param) return undefined;
  if (typeof param.value === 'string') return param.value;
  if (typeof param.boolValue === 'boolean') return String(param.boolValue);
  if (typeof param.intValue === 'string') return param.intValue;
  if (param.multiValue?.length) return param.multiValue.join(', ');
  return undefined;
}

/**
 * True when the API rejected the call because the connection lacks the
 * audit scope. The runtime attaches `status` to the thrown Error.
 */
export function isInsufficientScopeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = (error as Error & { status?: unknown }).status;
  return status === 403 || status === 401;
}

/** Human-readable actor for a finding title. */
export function describeActor(activity: GoogleWorkspaceActivity): string {
  return activity.actor?.email ?? activity.actor?.profileId ?? 'unknown actor';
}

/** ISO timestamp for `lookbackDays` ago, which is what startTime expects. */
export function lookbackStartTime(lookbackDays: number, now: Date = new Date()): string {
  return new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Fetch admin console activities since `startTime`, following pagination.
 *
 * Throws whatever `ctx.fetch` throws — callers use `isInsufficientScopeError`
 * to turn a missing-scope rejection into an actionable finding instead of a
 * check crash, since existing connections predate the audit scope.
 */
export async function fetchAdminActivities({
  ctx,
  startTime,
  eventName,
}: {
  ctx: CheckContext;
  startTime: string;
  eventName?: string;
}): Promise<GoogleWorkspaceActivity[]> {
  const activities: GoogleWorkspaceActivity[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const params: Record<string, string> = { startTime, maxResults: MAX_PAGE_SIZE };
    if (eventName) params.eventName = eventName;
    if (pageToken) params.pageToken = pageToken;

    const response = await ctx.fetch<GoogleWorkspaceActivitiesResponse>(ADMIN_ACTIVITY_PATH, {
      params,
    });

    if (response.items?.length) activities.push(...response.items);

    pageToken = response.nextPageToken;
    pages += 1;

    if (pageToken && pages >= MAX_PAGES) {
      ctx.warn(`Stopped paging admin activity after ${MAX_PAGES} pages; results may be truncated`);
      break;
    }
  } while (pageToken);

  return activities;
}
