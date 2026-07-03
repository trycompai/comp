jest.mock('@db', () => ({ db: { member: { findFirst: jest.fn() } } }));

import { extractMemberEntries } from './people-access.service';
import type { CheckResultRow } from '../integration-platform/services/check-results.service';

function row(partial: Partial<CheckResultRow>): CheckResultRow {
  return {
    resourceId: 'org',
    resourceType: 'organization',
    passed: true,
    title: 'Access List',
    description: null,
    evidence: null,
    collectedAt: new Date('2026-07-01T00:00:00Z'),
    runId: 'run_1',
    connectionId: 'conn_1',
    ...partial,
  };
}

const EMAIL = 'jane@x.com';

describe('extractMemberEntries', () => {
  it('matches per-user rows by email, case-insensitively (shape A)', () => {
    const entries = extractMemberEntries(
      [
        row({
          resourceType: 'user',
          resourceId: 'Jane@X.com',
          title: 'Jane has access',
          evidence: { role: 'Editor', lastLogin: '2026-06-30' },
        }),
        row({ resourceType: 'user', resourceId: 'bob@x.com', evidence: { role: 'Owner' } }),
      ],
      EMAIL,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].summary).toBe('Editor');
    expect(entries[0].fields).toMatchObject({ Role: 'Editor', 'Last login': '2026-06-30' });
  });

  it('digs the member out of roster arrays in org-level evidence (shape B)', () => {
    const entries = extractMemberEntries(
      [
        row({
          evidence: {
            totalUsers: 2,
            employees: [
              {
                primaryEmail: 'JANE@x.com',
                role: 'Super Admin',
                roles: ['Super Admin'],
                isAdmin: true,
                suspended: false,
              },
              { primaryEmail: 'bob@x.com', role: 'User' },
            ],
          },
        }),
      ],
      EMAIL,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].summary).toBe('Super Admin');
    expect(entries[0].fields).toMatchObject({
      Role: 'Super Admin',
      Admin: 'true',
      Suspended: 'false',
    });
    // Raw record preserved for the details view.
    expect(entries[0].raw).toMatchObject({ primaryEmail: 'JANE@x.com' });
  });

  it('returns nothing when the source keys users some other way (e.g. logins)', () => {
    const entries = extractMemberEntries(
      [row({ resourceType: 'user', resourceId: 'jane-gh-login', evidence: { role: 'admin' } })],
      EMAIL,
    );
    expect(entries).toEqual([]);
  });

  it('tolerates malformed evidence without throwing', () => {
    const entries = extractMemberEntries(
      [
        row({ evidence: 'just a string' }),
        row({ evidence: { employees: 'not-an-array' } }),
        row({ evidence: { users: [null, 42, { noEmail: true }] } }),
      ],
      EMAIL,
    );
    expect(entries).toEqual([]);
  });
});
