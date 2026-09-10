import { describe, expect, it } from 'bun:test';
import {
  filterGoogleWorkspaceUsersForChecks,
  parseGoogleWorkspaceCheckUserFilter,
  resolveGoogleWorkspaceUserFilter,
} from '../check-user-filter';
import type { GoogleWorkspaceDirectoryClient } from '../directory-client';
import type { GoogleWorkspaceUser } from '../types';

const user = (over: Partial<GoogleWorkspaceUser> & { primaryEmail: string; id: string }): GoogleWorkspaceUser => ({
  name: { givenName: 'T', familyName: 'U', fullName: 'T U' },
  isAdmin: false,
  isDelegatedAdmin: false,
  isEnrolledIn2Sv: true,
  isEnforcedIn2Sv: true,
  suspended: false,
  archived: false,
  creationTime: '2024-01-01T00:00:00Z',
  lastLoginTime: '2026-01-01T00:00:00Z',
  orgUnitPath: '/',
  ...over,
});

const client = (members: Record<string, string[]>): GoogleWorkspaceDirectoryClient => ({
  warn: () => {},
  fetch: async <T>(path: string): Promise<T> => {
    const groupId = decodeURIComponent(path.split('/groups/')[1]?.split('/')[0] ?? '');
    return {
      members: (members[groupId] ?? []).map((id) => ({ id, type: 'USER' })),
    } as unknown as T;
  },
});

const alice = user({ id: 'u1', primaryEmail: 'alice@corp.com' });
const bob = user({ id: 'u2', primaryEmail: 'bob@corp.com' });
const carol = user({ id: 'u3', primaryEmail: 'carol@contractor.io' });

describe('domain filtering', () => {
  it('keeps only users in the selected domains', () => {
    const config = parseGoogleWorkspaceCheckUserFilter({ target_domains: ['corp.com'] });
    const kept = filterGoogleWorkspaceUsersForChecks([alice, bob, carol], config);
    expect(kept.map((u) => u.id)).toEqual(['u1', 'u2']);
  });

  it('tolerates a leading @ and mixed case', () => {
    const config = parseGoogleWorkspaceCheckUserFilter({ target_domains: ['@CORP.com'] });
    expect(filterGoogleWorkspaceUsersForChecks([alice, carol], config).map((u) => u.id)).toEqual([
      'u1',
    ]);
  });

  it('is inactive when no domains are selected', () => {
    const config = parseGoogleWorkspaceCheckUserFilter({});
    expect(filterGoogleWorkspaceUsersForChecks([alice, carol], config)).toHaveLength(2);
  });
});

describe('group filtering', () => {
  it('keeps only members of the selected groups', async () => {
    const base = parseGoogleWorkspaceCheckUserFilter({ target_groups: ['eng@corp.com'] });
    const config = await resolveGoogleWorkspaceUserFilter({
      client: client({ 'eng@corp.com': ['u1'] }),
      config: base,
    });
    expect(filterGoogleWorkspaceUsersForChecks([alice, bob, carol], config).map((u) => u.id)).toEqual(
      ['u1'],
    );
  });

  it('unions membership across multiple groups', async () => {
    const base = parseGoogleWorkspaceCheckUserFilter({
      target_groups: ['eng@corp.com', 'ops@corp.com'],
    });
    const config = await resolveGoogleWorkspaceUserFilter({
      client: client({ 'eng@corp.com': ['u1'], 'ops@corp.com': ['u3'] }),
      config: base,
    });
    expect(filterGoogleWorkspaceUsersForChecks([alice, bob, carol], config).map((u) => u.id)).toEqual(
      ['u1', 'u3'],
    );
  });

  it('excludes everyone when the selected group is empty, rather than disabling the filter', async () => {
    const base = parseGoogleWorkspaceCheckUserFilter({ target_groups: ['empty@corp.com'] });
    const config = await resolveGoogleWorkspaceUserFilter({
      client: client({ 'empty@corp.com': [] }),
      config: base,
    });
    expect(filterGoogleWorkspaceUsersForChecks([alice, bob], config)).toHaveLength(0);
  });

  it('is inactive when no groups are selected', async () => {
    const base = parseGoogleWorkspaceCheckUserFilter({});
    const config = await resolveGoogleWorkspaceUserFilter({ client: client({}), config: base });
    expect(config.targetGroupMemberIds).toBeUndefined();
    expect(filterGoogleWorkspaceUsersForChecks([alice, bob], config)).toHaveLength(2);
  });
});

describe('combined with existing filters', () => {
  it('applies domain, group, OU and email rules together', async () => {
    const base = parseGoogleWorkspaceCheckUserFilter({
      target_domains: ['corp.com'],
      target_groups: ['eng@corp.com'],
      sync_user_filter_mode: 'exclude',
      sync_excluded_emails: ['bob@corp.com'],
    });
    const config = await resolveGoogleWorkspaceUserFilter({
      client: client({ 'eng@corp.com': ['u1', 'u2'] }),
      config: base,
    });
    // carol fails domain, bob is excluded by email, alice survives all four.
    expect(filterGoogleWorkspaceUsersForChecks([alice, bob, carol], config).map((u) => u.id)).toEqual(
      ['u1'],
    );
  });

  it('still drops suspended and archived users', async () => {
    const suspended = user({ id: 'u4', primaryEmail: 'sus@corp.com', suspended: true });
    const config = parseGoogleWorkspaceCheckUserFilter({ target_domains: ['corp.com'] });
    expect(filterGoogleWorkspaceUsersForChecks([suspended], config)).toHaveLength(0);
  });
});
