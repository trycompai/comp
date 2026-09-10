import type {
  GoogleWorkspaceDomainsResponse,
  GoogleWorkspaceGroupMembersResponse,
  GoogleWorkspaceGroup,
} from './types';

const DIRECTORY_BASE = 'https://admin.googleapis.com';

/**
 * The slice of a client this module needs.
 *
 * `CheckContext` satisfies this structurally, and the API's employee sync can
 * adapt a raw bearer-token fetch via `createBearerTokenClient` — so checks and
 * sync share one implementation of group/domain resolution instead of
 * maintaining parallel copies.
 */
export interface GoogleWorkspaceDirectoryClient {
  fetch: <T>(path: string, options?: { params?: Record<string, string> }) => Promise<T>;
  warn?: (message: string) => void;
}

interface GroupListResponse {
  groups?: GoogleWorkspaceGroup[];
  nextPageToken?: string;
}

/** Adapt a raw access token to the client shape (used outside check runs). */
export function createBearerTokenClient(
  accessToken: string,
  warn?: (message: string) => void,
): GoogleWorkspaceDirectoryClient {
  return {
    warn,
    fetch: async <T>(path: string, options?: { params?: Record<string, string> }): Promise<T> => {
      const url = new URL(path, DIRECTORY_BASE);
      for (const [key, value] of Object.entries(options?.params ?? {})) {
        url.searchParams.set(key, value);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = new Error(
          `Google Directory API ${response.status}: ${response.statusText}`,
        ) as Error & { status: number };
        error.status = response.status;
        throw error;
      }

      return (await response.json()) as T;
    },
  };
}

/**
 * Direct USER members of a group.
 *
 * Nested groups are NOT expanded — a GROUP-typed member is skipped with a
 * warning rather than recursed into, which avoids membership cycles and
 * matches how directory-based access reviews scope "members".
 */
export async function fetchGroupMemberUserIds({
  client,
  groupId,
}: {
  client: GoogleWorkspaceDirectoryClient;
  groupId: string;
}): Promise<string[]> {
  const memberIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = { maxResults: '200' };
    if (pageToken) params.pageToken = pageToken;

    const response = await client.fetch<GoogleWorkspaceGroupMembersResponse>(
      `/admin/directory/v1/groups/${encodeURIComponent(groupId)}/members`,
      { params },
    );

    for (const member of response.members ?? []) {
      if (member.type === 'GROUP') {
        client.warn?.(`Nested group ${member.email ?? member.id} in ${groupId} not expanded`);
        continue;
      }
      if (member.type && member.type !== 'USER') continue;
      if (member.id) memberIds.push(member.id);
    }

    pageToken = response.nextPageToken;
  } while (pageToken);

  return memberIds;
}

/**
 * Union of member ids across several groups.
 *
 * Returns `undefined` when no groups are requested, which callers read as
 * "no group filter" — distinct from an empty set, which means "groups were
 * requested and matched nobody".
 */
export async function fetchMemberIdsForGroups({
  client,
  groupIds,
}: {
  client: GoogleWorkspaceDirectoryClient;
  groupIds: string[] | undefined;
}): Promise<Set<string> | undefined> {
  if (!groupIds?.length) return undefined;

  const memberIds = new Set<string>();
  for (const groupId of groupIds) {
    try {
      for (const id of await fetchGroupMemberUserIds({ client, groupId })) {
        memberIds.add(id);
      }
    } catch {
      // Surface loudly: a group that cannot be read would otherwise silently
      // shrink the synced population.
      client.warn?.(
        `Could not read members of group ${groupId}; users in it will be excluded. ` +
          'admin.directory.group.readonly may not be granted.',
      );
    }
  }

  return memberIds;
}

/** All groups in the tenant, for the group picker. */
export async function listGroups(
  client: GoogleWorkspaceDirectoryClient,
): Promise<GoogleWorkspaceGroup[]> {
  const groups: GoogleWorkspaceGroup[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = { customer: 'my_customer', maxResults: '200' };
    if (pageToken) params.pageToken = pageToken;

    const response = await client.fetch<GroupListResponse>('/admin/directory/v1/groups', {
      params,
    });

    if (response.groups?.length) groups.push(...response.groups);
    pageToken = response.nextPageToken;
  } while (pageToken);

  return groups;
}

/** Verified domains in the tenant, for the domain picker. */
export async function listDomains(
  client: GoogleWorkspaceDirectoryClient,
): Promise<string[]> {
  const response = await client.fetch<GoogleWorkspaceDomainsResponse>(
    '/admin/directory/v1/customer/my_customer/domains',
  );
  return (response.domains ?? []).map((d) => d.domainName);
}
