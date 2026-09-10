import { describe, expect, it } from 'bun:test';
import { isGroupAssignment, resolveRoleAssignments } from '../role-assignments';
import type { CheckContext } from '../../../types';
import type { GoogleWorkspaceRoleAssignment } from '../types';

/** Context whose fetch is driven by a path -> payload function. */
function makeCtx(
  handler: (path: string) => unknown,
): CheckContext & { warnings: string[] } {
  const warnings: string[] = [];
  const ctx = {
    accessToken: 'tok',
    credentials: {},
    variables: {},
    connectionId: 'conn_1',
    organizationId: 'org_1',
    log: () => {},
    warn: (m: string) => {
      warnings.push(m);
    },
    error: () => {},
    pass: () => {},
    fail: () => {},
    fetch: (async <T,>(path: string): Promise<T> => handler(path) as T),
    warnings,
  } as unknown as CheckContext & { warnings: string[] };
  return ctx;
}

const assignment = (
  over: Partial<GoogleWorkspaceRoleAssignment> & { assignedTo: string },
): GoogleWorkspaceRoleAssignment => ({
  roleAssignmentId: `ra_${over.assignedTo}`,
  roleId: 'role_1',
  scopeType: 'CUSTOMER',
  ...over,
});

const roleMap = new Map([['role_1', 'Groups Admin']]);

describe('isGroupAssignment', () => {
  it('treats an absent assigneeType as a user assignment', () => {
    expect(isGroupAssignment(assignment({ assignedTo: 'u1' }))).toBe(false);
    expect(isGroupAssignment(assignment({ assignedTo: 'u1', assigneeType: 'user' }))).toBe(false);
    expect(isGroupAssignment(assignment({ assignedTo: 'g1', assigneeType: 'group' }))).toBe(true);
  });
});

describe('resolveRoleAssignments', () => {
  it('maps direct assignments to the user with direct provenance', async () => {
    const ctx = makeCtx(() => {
      throw new Error('should not fetch groups');
    });
    const { grantsByUserId, unresolvedGroupAssignments } = await resolveRoleAssignments({
      ctx,
      assignments: [assignment({ assignedTo: 'u1' })],
      roleMap,
    });
    expect(grantsByUserId.get('u1')).toEqual([{ roleName: 'Groups Admin', source: 'direct' }]);
    expect(unresolvedGroupAssignments).toHaveLength(0);
  });

  it('expands a group assignment to every member — the bug being fixed', async () => {
    const ctx = makeCtx(() => ({
      members: [
        { id: 'u1', type: 'USER' },
        { id: 'u2', type: 'USER' },
      ],
    }));
    const { grantsByUserId } = await resolveRoleAssignments({
      ctx,
      assignments: [assignment({ assignedTo: 'g1', assigneeType: 'group' })],
      roleMap,
    });
    // Previously this produced grantsByUserId.get('g1') and no user rows at all.
    expect(grantsByUserId.get('g1')).toBeUndefined();
    expect(grantsByUserId.get('u1')).toEqual([
      { roleName: 'Groups Admin', source: 'group', viaGroup: 'g1' },
    ]);
    expect(grantsByUserId.get('u2')).toHaveLength(1);
  });

  it('records unresolved groups instead of silently dropping them', async () => {
    const ctx = makeCtx(() => {
      const err = new Error('HTTP 403: Forbidden') as Error & { status: number };
      err.status = 403;
      throw err;
    });
    const { grantsByUserId, unresolvedGroupAssignments } = await resolveRoleAssignments({
      ctx,
      assignments: [assignment({ assignedTo: 'g1', assigneeType: 'group' })],
      roleMap,
    });
    expect(grantsByUserId.size).toBe(0);
    expect(unresolvedGroupAssignments).toEqual([{ groupId: 'g1', roleName: 'Groups Admin' }]);
  });

  it('fetches each group once across multiple role assignments', async () => {
    let groupFetches = 0;
    const ctx = makeCtx((path) => {
      if (path.includes('/groups/')) {
        groupFetches += 1;
        return { members: [{ id: 'u1', type: 'USER' }] };
      }
      throw new Error(`unexpected ${path}`);
    });
    const { grantsByUserId } = await resolveRoleAssignments({
      ctx,
      assignments: [
        assignment({ assignedTo: 'g1', assigneeType: 'group', roleId: 'role_1' }),
        assignment({ assignedTo: 'g1', assigneeType: 'group', roleId: 'role_2' }),
      ],
      roleMap,
    });
    expect(groupFetches).toBe(1);
    expect(grantsByUserId.get('u1')).toHaveLength(2);
  });

  it('combines direct and group grants for the same user', async () => {
    const ctx = makeCtx(() => ({ members: [{ id: 'u1', type: 'USER' }] }));
    const { grantsByUserId } = await resolveRoleAssignments({
      ctx,
      assignments: [
        assignment({ assignedTo: 'u1' }),
        assignment({ assignedTo: 'g1', assigneeType: 'group', roleId: 'role_2' }),
      ],
      roleMap,
    });
    const grants = grantsByUserId.get('u1') ?? [];
    expect(grants.map((g) => g.source).sort()).toEqual(['direct', 'group']);
  });

  it('falls back to the role id when the role name is unknown', async () => {
    const ctx = makeCtx(() => ({ members: [] }));
    const { grantsByUserId } = await resolveRoleAssignments({
      ctx,
      assignments: [assignment({ assignedTo: 'u1', roleId: 'role_zzz' })],
      roleMap,
    });
    expect(grantsByUserId.get('u1')?.[0].roleName).toBe('Role role_zzz');
  });
});
