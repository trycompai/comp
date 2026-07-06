import { describe, expect, it } from 'bun:test';
import { employeeAccessCheck } from '../checks/employee-access';
import type { CheckContext, CheckResult, CheckVariableValues } from '../../../types';
import type { GoogleWorkspaceUser } from '../types';

const makeUser = (overrides: Partial<GoogleWorkspaceUser> & { primaryEmail: string }): GoogleWorkspaceUser => ({
  id: `id_${overrides.primaryEmail}`,
  name: { givenName: 'Test', familyName: 'User', fullName: 'Test User' },
  isAdmin: false,
  isDelegatedAdmin: false,
  isEnrolledIn2Sv: true,
  isEnforcedIn2Sv: true,
  suspended: false,
  archived: false,
  creationTime: '2024-01-01T00:00:00Z',
  lastLoginTime: '2026-01-01T00:00:00Z',
  orgUnitPath: '/',
  ...overrides,
});

async function runCheck(
  users: GoogleWorkspaceUser[],
  variables: CheckVariableValues = {},
): Promise<{ passed: CheckResult[]; failed: CheckResult[] }> {
  const passed: CheckResult[] = [];
  const failed: CheckResult[] = [];

  const ctx: CheckContext = {
    accessToken: 'tok',
    credentials: {},
    variables,
    connectionId: 'conn_1',
    organizationId: 'org_1',
    metadata: {},
    log: () => {},
    pass: (result) => {
      passed.push(result as CheckResult);
    },
    fail: (result) => {
      failed.push(result as CheckResult);
    },
    fetch: (async <T,>(path: string): Promise<T> => {
      if (path.includes('/roles')) {
        return { items: [{ roleId: 'r1', roleName: 'Groups Admin' }] } as unknown as T;
      }
      if (path.includes('/roleassignments')) {
        return {
          items: users
            .filter((u) => u.isDelegatedAdmin)
            .map((u) => ({ roleId: 'r1', assignedTo: u.id })),
        } as unknown as T;
      }
      if (path.includes('/users')) {
        return { kind: 'k', users } as unknown as T;
      }
      throw new Error(`Unexpected fetch: ${path}`);
    }) as CheckContext['fetch'],
    fetchAllPages: (async () => []) as CheckContext['fetchAllPages'],
    graphql: (async () => ({})) as CheckContext['graphql'],
  } as CheckContext;

  await employeeAccessCheck.run(ctx);
  return { passed, failed };
}

describe('employeeAccessCheck per-user emission', () => {
  it('emits one user row per person, keyed by lowercased email', async () => {
    const users = [
      makeUser({ primaryEmail: 'Admin@Example.com', isAdmin: true }),
      makeUser({ primaryEmail: 'person@example.com' }),
    ];

    const { passed, failed } = await runCheck(users);

    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(2);
    expect(passed.every((r) => r.resourceType === 'user')).toBe(true);
    expect(passed.map((r) => r.resourceId).sort()).toEqual([
      'admin@example.com',
      'person@example.com',
    ]);
  });

  it('carries role details in each row evidence', async () => {
    const users = [
      makeUser({ primaryEmail: 'admin@example.com', isAdmin: true }),
      makeUser({ primaryEmail: 'delegated@example.com', isDelegatedAdmin: true }),
      makeUser({ primaryEmail: 'person@example.com' }),
    ];

    const { passed } = await runCheck(users);

    const byEmail = new Map(passed.map((r) => [r.resourceId, r]));
    expect((byEmail.get('admin@example.com')?.evidence as { role: string }).role).toBe(
      'Super Admin',
    );
    expect((byEmail.get('delegated@example.com')?.evidence as { role: string }).role).toBe(
      'Delegated Admin',
    );
    expect((byEmail.get('person@example.com')?.evidence as { role: string }).role).toBe('User');
    expect((byEmail.get('person@example.com')?.evidence as { email: string }).email).toBe(
      'person@example.com',
    );
  });

  it('excludes suspended users by default (same filter as employee sync)', async () => {
    const users = [
      makeUser({ primaryEmail: 'active@example.com' }),
      makeUser({ primaryEmail: 'gone@example.com', suspended: true }),
    ];

    const { passed } = await runCheck(users);

    expect(passed.map((r) => r.resourceId)).toEqual(['active@example.com']);
  });

  it('emits a single org-level summary row when no users match the filters', async () => {
    const users = [makeUser({ primaryEmail: 'gone@example.com', suspended: true })];

    const { passed, failed } = await runCheck(users);

    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
    expect(passed[0].resourceType).toBe('organization');
    expect(passed[0].resourceId).toBe('google-workspace');
  });
});
