import { describe, expect, it } from 'bun:test';
import {
  fetchGroupMemberUserIds,
  fetchMemberIdsForGroups,
  listDomains,
  listGroups,
  type GoogleWorkspaceDirectoryClient,
} from '../directory-client';

function makeClient(handler: (path: string) => unknown): GoogleWorkspaceDirectoryClient & {
  warnings: string[];
  paths: string[];
} {
  const warnings: string[] = [];
  const paths: string[] = [];
  return {
    warnings,
    paths,
    warn: (m: string) => {
      warnings.push(m);
    },
    fetch: async <T>(path: string): Promise<T> => {
      paths.push(path);
      return handler(path) as T;
    },
  };
}

describe('fetchGroupMemberUserIds', () => {
  it('returns USER members and skips nested groups', async () => {
    const client = makeClient(() => ({
      members: [
        { id: 'u1', email: 'a@x.com', type: 'USER' },
        { id: 'g2', email: 'nested@x.com', type: 'GROUP' },
        { id: 'u2', email: 'b@x.com', type: 'USER' },
        { id: 'c1', type: 'CUSTOMER' },
      ],
    }));
    expect(await fetchGroupMemberUserIds({ client, groupId: 'g1' })).toEqual(['u1', 'u2']);
    expect(client.warnings.join(' ')).toContain('Nested group');
  });

  it('follows pagination', async () => {
    let call = 0;
    const client = makeClient(() => {
      call += 1;
      return call === 1
        ? { members: [{ id: 'u1', type: 'USER' }], nextPageToken: 'p2' }
        : { members: [{ id: 'u2', type: 'USER' }] };
    });
    expect(await fetchGroupMemberUserIds({ client, groupId: 'g1' })).toEqual(['u1', 'u2']);
  });

  it('url-encodes the group id', async () => {
    const client = makeClient(() => ({ members: [] }));
    await fetchGroupMemberUserIds({ client, groupId: 'team+eng@x.com' });
    expect(client.paths[0]).toContain('team%2Beng%40x.com');
  });
});

describe('fetchMemberIdsForGroups', () => {
  it('returns undefined when no groups are selected — meaning no filter', async () => {
    const client = makeClient(() => ({ members: [] }));
    expect(await fetchMemberIdsForGroups({ client, groupIds: undefined })).toBeUndefined();
    expect(await fetchMemberIdsForGroups({ client, groupIds: [] })).toBeUndefined();
  });

  it('unions members across groups, de-duplicating', async () => {
    const client = makeClient((path) =>
      path.includes('g1')
        ? { members: [{ id: 'u1', type: 'USER' }, { id: 'u2', type: 'USER' }] }
        : { members: [{ id: 'u2', type: 'USER' }, { id: 'u3', type: 'USER' }] },
    );
    const ids = await fetchMemberIdsForGroups({ client, groupIds: ['g1', 'g2'] });
    expect([...(ids ?? [])].sort()).toEqual(['u1', 'u2', 'u3']);
  });

  it('warns and continues when one group cannot be read', async () => {
    const client = makeClient((path) => {
      if (path.includes('g1')) throw new Error('403');
      return { members: [{ id: 'u2', type: 'USER' }] };
    });
    const ids = await fetchMemberIdsForGroups({ client, groupIds: ['g1', 'g2'] });
    expect([...(ids ?? [])]).toEqual(['u2']);
    expect(client.warnings.join(' ')).toContain('Could not read members of group g1');
  });
});

describe('listGroups / listDomains', () => {
  it('pages through groups', async () => {
    let call = 0;
    const client = makeClient(() => {
      call += 1;
      return call === 1
        ? { groups: [{ id: 'g1', email: 'a@x.com' }], nextPageToken: 'p2' }
        : { groups: [{ id: 'g2', email: 'b@x.com' }] };
    });
    expect((await listGroups(client)).map((g) => g.id)).toEqual(['g1', 'g2']);
  });

  it('maps domains to names', async () => {
    const client = makeClient(() => ({
      domains: [
        { domainName: 'x.com', isPrimary: true, verified: true, creationTime: '' },
        { domainName: 'y.com', isPrimary: false, verified: true, creationTime: '' },
      ],
    }));
    expect(await listDomains(client)).toEqual(['x.com', 'y.com']);
  });
});
