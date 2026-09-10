import { describe, expect, it } from 'bun:test';
import { adminPrivilegeChangesCheck } from '../checks/admin-privilege-changes';
import { adminSecurityEventsCheck } from '../checks/admin-security-events';
import { getEventParameter, isInsufficientScopeError, lookbackStartTime } from '../admin-audit-events';
import type { CheckContext, CheckResult, CheckVariableValues } from '../../../types';
import type { GoogleWorkspaceActivity } from '../types';

const activity = (
  time: string,
  actorEmail: string | undefined,
  events: GoogleWorkspaceActivity['events'],
): GoogleWorkspaceActivity => ({
  id: { time, applicationName: 'admin' },
  actor: actorEmail ? { email: actorEmail, callerType: 'USER' } : undefined,
  ipAddress: '198.51.100.7',
  events,
});

type RunResult = { passed: CheckResult[]; failed: CheckResult[]; logs: string[] };

/** Drive a check against a canned activity list (or a fetch that throws). */
async function runCheck(
  check: typeof adminPrivilegeChangesCheck,
  {
    activities = [],
    variables = {},
    fetchError,
  }: {
    activities?: GoogleWorkspaceActivity[];
    variables?: CheckVariableValues;
    fetchError?: Error;
  },
): Promise<RunResult> {
  const passed: CheckResult[] = [];
  const failed: CheckResult[] = [];
  const logs: string[] = [];

  const ctx: CheckContext = {
    accessToken: 'tok',
    credentials: {},
    variables,
    connectionId: 'conn_1',
    organizationId: 'org_1',
    metadata: {},
    log: (m: string) => {
      logs.push(m);
    },
    warn: () => {},
    error: () => {},
    pass: (r) => {
      passed.push(r as CheckResult);
    },
    fail: (r) => {
      failed.push(r as CheckResult);
    },
    fetch: (async <T,>(): Promise<T> => {
      if (fetchError) throw fetchError;
      return { items: activities } as unknown as T;
    }) as CheckContext['fetch'],
  } as CheckContext;

  await check.run(ctx);
  return { passed, failed, logs };
}

function scopeError(status: number): Error {
  const err = new Error(`HTTP ${status}: Forbidden`) as Error & { status: number };
  err.status = status;
  return err;
}

describe('admin-audit helpers', () => {
  it('reads string, bool, int, and multi-value parameters', () => {
    const event = {
      name: 'ASSIGN_ROLE',
      parameters: [
        { name: 'ROLE_NAME', value: '_SEED_ADMIN_ROLE' },
        { name: 'FLAG', boolValue: false },
        { name: 'COUNT', intValue: '3' },
        { name: 'LIST', multiValue: ['a', 'b'] },
      ],
    };
    expect(getEventParameter(event, 'ROLE_NAME')).toBe('_SEED_ADMIN_ROLE');
    expect(getEventParameter(event, 'FLAG')).toBe('false');
    expect(getEventParameter(event, 'COUNT')).toBe('3');
    expect(getEventParameter(event, 'LIST')).toBe('a, b');
    expect(getEventParameter(event, 'MISSING')).toBeUndefined();
  });

  it('treats 401/403 as missing scope but not 500 or non-errors', () => {
    expect(isInsufficientScopeError(scopeError(403))).toBe(true);
    expect(isInsufficientScopeError(scopeError(401))).toBe(true);
    expect(isInsufficientScopeError(scopeError(500))).toBe(false);
    expect(isInsufficientScopeError('nope')).toBe(false);
  });

  it('computes the lookback start time from a fixed now', () => {
    const now = new Date('2026-03-31T00:00:00.000Z');
    expect(lookbackStartTime(30, now)).toBe('2026-03-01T00:00:00.000Z');
  });
});

describe('adminPrivilegeChangesCheck', () => {
  it('passes with evidence when no privilege changes occurred', async () => {
    const { passed, failed } = await runCheck(adminPrivilegeChangesCheck, { activities: [] });
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
    expect(passed[0].title).toBe('No admin privilege changes in review window');
    expect(passed[0].evidence?.lookbackDays).toBe(30);
  });

  it('flags an unapproved privilege change for review', async () => {
    const { failed } = await runCheck(adminPrivilegeChangesCheck, {
      activities: [
        activity('2026-03-01T10:00:00.000Z', 'rogue@corp.com', [
          {
            name: 'ASSIGN_ROLE',
            parameters: [
              { name: 'ROLE_NAME', value: 'Groups Admin' },
              { name: 'USER_EMAIL', value: 'newadmin@corp.com' },
            ],
          },
        ]),
      ],
    });
    expect(failed).toHaveLength(1);
    expect(failed[0].severity).toBe('medium');
    expect(failed[0].description).toContain('rogue@corp.com');
    expect(failed[0].description).toContain('newadmin@corp.com');
  });

  it('escalates super admin grants to high severity', async () => {
    const { failed } = await runCheck(adminPrivilegeChangesCheck, {
      activities: [
        activity('2026-03-02T10:00:00.000Z', 'rogue@corp.com', [
          {
            name: 'ASSIGN_ROLE',
            parameters: [
              { name: 'ROLE_NAME', value: '_SEED_ADMIN_ROLE' },
              { name: 'USER_EMAIL', value: 'newadmin@corp.com' },
            ],
          },
        ]),
      ],
    });
    expect(failed).toHaveLength(1);
    expect(failed[0].severity).toBe('high');
    expect(failed[0].title).toContain('Super admin');
  });

  it('passes changes made by an approved actor, case-insensitively', async () => {
    const { passed, failed } = await runCheck(adminPrivilegeChangesCheck, {
      variables: { admin_audit_approved_actors: ['IT-Automation@corp.com'] },
      activities: [
        activity('2026-03-03T10:00:00.000Z', 'it-automation@corp.com', [
          { name: 'ASSIGN_ROLE', parameters: [{ name: 'USER_EMAIL', value: 'x@corp.com' }] },
        ]),
      ],
    });
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
    expect(passed[0].title).toBe('Privilege change by approved admin');
  });

  it('ignores events that are not privilege changes', async () => {
    const { passed, failed } = await runCheck(adminPrivilegeChangesCheck, {
      activities: [activity('2026-03-04T10:00:00.000Z', 'a@corp.com', [{ name: 'LOGIN' }])],
    });
    expect(failed).toHaveLength(0);
    expect(passed[0].title).toBe('No admin privilege changes in review window');
  });

  it('reports a missing audit scope as actionable instead of throwing', async () => {
    const { failed } = await runCheck(adminPrivilegeChangesCheck, {
      fetchError: scopeError(403),
    });
    expect(failed).toHaveLength(1);
    expect(failed[0].title).toBe('Admin audit log not accessible');
    expect(failed[0].remediation).toContain('Reconnect');
  });

  it('rethrows errors that are not scope problems', async () => {
    await expect(
      runCheck(adminPrivilegeChangesCheck, { fetchError: scopeError(500) }),
    ).rejects.toThrow('HTTP 500');
  });
});

describe('adminSecurityEventsCheck', () => {
  it('passes when no monitored security settings changed', async () => {
    const { passed, failed } = await runCheck(adminSecurityEventsCheck, { activities: [] });
    expect(failed).toHaveLength(0);
    expect(passed[0].title).toBe('No security-weakening admin changes detected');
    expect(Array.isArray(passed[0].evidence?.monitoredEvents)).toBe(true);
  });

  it('flags a 2SV enforcement change with its mapped severity', async () => {
    const { failed } = await runCheck(adminSecurityEventsCheck, {
      activities: [
        activity('2026-03-05T10:00:00.000Z', 'admin@corp.com', [
          {
            name: 'ENFORCE_STRONG_AUTHENTICATION',
            parameters: [{ name: 'NEW_VALUE', value: 'false' }],
          },
        ]),
      ],
    });
    expect(failed).toHaveLength(1);
    expect(failed[0].severity).toBe('high');
    expect(failed[0].evidence?.newValue).toBe('false');
  });

  it('handles a system activity with no actor email', async () => {
    const { failed } = await runCheck(adminSecurityEventsCheck, {
      activities: [
        activity('2026-03-06T10:00:00.000Z', undefined, [
          { name: 'TOGGLE_ENABLE_OAUTH2_ACCESS' },
        ]),
      ],
    });
    expect(failed).toHaveLength(1);
    expect(failed[0].description).toContain('unknown actor');
  });

  it('honours a configured lookback window', async () => {
    const { passed } = await runCheck(adminSecurityEventsCheck, {
      variables: { admin_audit_lookback_days: '90' },
    });
    expect(passed[0].evidence?.lookbackDays).toBe(90);
  });
});
