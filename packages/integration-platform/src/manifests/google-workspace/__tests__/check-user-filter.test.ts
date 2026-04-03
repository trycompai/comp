import { describe, expect, it } from 'bun:test';
import {
  filterGoogleWorkspaceUsersForChecks,
  parseGoogleWorkspaceCheckUserFilter,
  shouldIncludeGoogleWorkspaceUserForCheck,
} from '../check-user-filter';
import type { GoogleWorkspaceUser } from '../types';

const baseUser = (overrides: Partial<GoogleWorkspaceUser>): GoogleWorkspaceUser => ({
  id: 'u1',
  primaryEmail: 'a@example.com',
  name: { givenName: 'A', familyName: 'B', fullName: 'A B' },
  isAdmin: false,
  isDelegatedAdmin: false,
  isEnrolledIn2Sv: true,
  isEnforcedIn2Sv: false,
  suspended: false,
  archived: false,
  creationTime: '',
  lastLoginTime: '',
  orgUnitPath: '/Staff',
  ...overrides,
});

describe('parseGoogleWorkspaceCheckUserFilter', () => {
  it('parses connection-style variables', () => {
    const config = parseGoogleWorkspaceCheckUserFilter({
      target_org_units: ['/Staff'],
      sync_excluded_emails: ['skip@example.com'],
      sync_included_emails: [],
      sync_user_filter_mode: 'exclude',
      include_suspended: 'false',
    });
    expect(config.targetOrgUnits).toEqual(['/Staff']);
    expect(config.excludedTerms).toContain('skip@example.com');
    expect(config.userFilterMode).toBe('exclude');
    expect(config.includeSuspended).toBe(false);
  });
});

describe('shouldIncludeGoogleWorkspaceUserForCheck', () => {
  it('drops users outside target OUs', () => {
    const config = parseGoogleWorkspaceCheckUserFilter({
      target_org_units: ['/Engineering'],
      include_suspended: 'false',
    });
    expect(
      shouldIncludeGoogleWorkspaceUserForCheck(
        baseUser({ orgUnitPath: '/Sales' }),
        config,
      ),
    ).toBe(false);
    expect(
      shouldIncludeGoogleWorkspaceUserForCheck(
        baseUser({ orgUnitPath: '/Engineering/TeamA' }),
        config,
      ),
    ).toBe(true);
  });

  it('respects exclude email terms', () => {
    const config = parseGoogleWorkspaceCheckUserFilter({
      sync_excluded_emails: ['a@example.com'],
      sync_user_filter_mode: 'exclude',
      include_suspended: 'false',
    });
    expect(shouldIncludeGoogleWorkspaceUserForCheck(baseUser({}), config)).toBe(false);
  });
});

describe('filterGoogleWorkspaceUsersForChecks', () => {
  it('filters an array', () => {
    const config = parseGoogleWorkspaceCheckUserFilter({
      sync_user_filter_mode: 'include',
      sync_included_emails: ['keep@example.com'],
      include_suspended: 'false',
    });
    const users = [
      baseUser({ primaryEmail: 'keep@example.com' }),
      baseUser({ id: 'u2', primaryEmail: 'drop@example.com' }),
    ];
    expect(filterGoogleWorkspaceUsersForChecks(users, config)).toHaveLength(1);
  });
});
