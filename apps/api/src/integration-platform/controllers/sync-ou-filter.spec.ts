import { filterUsersByOrgUnits } from './sync-ou-filter';

interface TestUser {
  primaryEmail: string;
  orgUnitPath: string;
  suspended?: boolean;
}

describe('filterUsersByOrgUnits', () => {
  const users: TestUser[] = [
    { primaryEmail: 'alice@example.com', orgUnitPath: '/' },
    { primaryEmail: 'bob@example.com', orgUnitPath: '/Engineering' },
    { primaryEmail: 'carol@example.com', orgUnitPath: '/Engineering/Frontend' },
    { primaryEmail: 'dave@example.com', orgUnitPath: '/Marketing' },
    { primaryEmail: 'eve@example.com', orgUnitPath: '/HR' },
    {
      primaryEmail: 'frank@example.com',
      orgUnitPath: '/Unlisted',
      suspended: true,
    },
  ];

  it('returns all users when no target OUs specified', () => {
    const result = filterUsersByOrgUnits(users, undefined);
    expect(result).toEqual(users);
  });

  it('returns all users when target OUs is an empty array', () => {
    const result = filterUsersByOrgUnits(users, []);
    expect(result).toEqual(users);
  });

  it('filters users to only those in selected OUs', () => {
    const result = filterUsersByOrgUnits(users, ['/Engineering']);
    expect(result.map((u) => u.primaryEmail)).toEqual([
      'bob@example.com',
      'carol@example.com',
    ]);
  });

  it('includes users in child OUs of selected OUs', () => {
    const result = filterUsersByOrgUnits(users, ['/Engineering']);
    expect(result.map((u) => u.primaryEmail)).toContain('carol@example.com');
  });

  it('exact match on OU path works', () => {
    const result = filterUsersByOrgUnits(users, ['/Engineering/Frontend']);
    expect(result.map((u) => u.primaryEmail)).toEqual(['carol@example.com']);
  });

  it('supports multiple target OUs', () => {
    const result = filterUsersByOrgUnits(users, ['/Engineering', '/Marketing']);
    expect(result.map((u) => u.primaryEmail)).toEqual([
      'bob@example.com',
      'carol@example.com',
      'dave@example.com',
    ]);
  });

  it('root OU includes all users', () => {
    const result = filterUsersByOrgUnits(users, ['/']);
    expect(result).toEqual(users);
  });

  it('excludes users not in any selected OU', () => {
    const result = filterUsersByOrgUnits(users, ['/Engineering']);
    const emails = result.map((u) => u.primaryEmail);
    expect(emails).not.toContain('alice@example.com');
    expect(emails).not.toContain('dave@example.com');
    expect(emails).not.toContain('eve@example.com');
    expect(emails).not.toContain('frank@example.com');
  });

  it('does not match partial OU path names', () => {
    // /Eng should NOT match /Engineering
    const result = filterUsersByOrgUnits(users, ['/Eng']);
    expect(result).toEqual([]);
  });

  it('preserves suspended user status through filtering', () => {
    const result = filterUsersByOrgUnits(users, ['/Unlisted']);
    expect(result).toEqual([
      {
        primaryEmail: 'frank@example.com',
        orgUnitPath: '/Unlisted',
        suspended: true,
      },
    ]);
  });
});
