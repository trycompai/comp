import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  computePendingPolicies,
  filterDigestMembersByCompliance,
  type DigestMember,
  type DigestPolicy,
} from './policy-acknowledgment-digest-helpers';

const alice: DigestMember = {
  id: 'mem_alice',
  role: 'employee',
  department: 'it',
  user: { id: 'usr_alice', name: 'Alice', email: 'alice@example.com' },
};
const bob: DigestMember = {
  id: 'mem_bob',
  role: 'employee',
  department: 'hr',
  user: { id: 'usr_bob', name: 'Bob', email: 'bob@example.com' },
};

const allPolicy: DigestPolicy = {
  id: 'pol_all',
  name: 'Access Control',
  signedBy: [],
  visibility: 'ALL',
  visibleToDepartments: [],
};
const itOnlyPolicy: DigestPolicy = {
  id: 'pol_it',
  name: 'IT Handbook',
  signedBy: [],
  visibility: 'DEPARTMENT',
  visibleToDepartments: ['it'],
};

describe('computePendingPolicies', () => {
  it('returns no pending policies when member has signed all applicable policies', () => {
    const policies: DigestPolicy[] = [{ ...allPolicy, signedBy: ['usr_alice'] }];
    expect(computePendingPolicies(alice, policies)).toEqual([]);
  });

  it('returns policies where the member id is missing from signedBy[]', () => {
    const policies: DigestPolicy[] = [
      { ...allPolicy, signedBy: ['usr_bob'] },
      { ...itOnlyPolicy, id: 'pol_2', name: 'Second', signedBy: ['usr_alice'] },
    ];
    expect(computePendingPolicies(alice, policies).map((p) => p.id)).toEqual(['pol_all']);
  });

  it('excludes DEPARTMENT-scoped policies when member department is not in the visible list', () => {
    const policies: DigestPolicy[] = [itOnlyPolicy];
    expect(computePendingPolicies(bob, policies)).toEqual([]);
  });

  it('includes DEPARTMENT-scoped policies when member department matches', () => {
    const policies: DigestPolicy[] = [itOnlyPolicy];
    expect(computePendingPolicies(alice, policies).map((p) => p.id)).toEqual(['pol_it']);
  });

  it('excludes DEPARTMENT-scoped policies when member has no department set', () => {
    const memberNoDept: DigestMember = { ...alice, department: null };
    expect(computePendingPolicies(memberNoDept, [itOnlyPolicy])).toEqual([]);
  });

  it('returns empty array when there are no policies', () => {
    expect(computePendingPolicies(alice, [])).toEqual([]);
  });
});

describe('filterDigestMembersByCompliance', () => {
  const mockDb = {
    organizationRole: { findMany: vi.fn() },
  };

  beforeEach(() => {
    mockDb.organizationRole.findMany.mockReset();
    mockDb.organizationRole.findMany.mockResolvedValue([]);
  });

  it('keeps members whose built-in role has the compliance obligation', async () => {
    const member: DigestMember = {
      id: 'm1', role: 'employee', department: 'it',
      user: { id: 'u1', name: 'A', email: 'a@x', role: null },
    };
    const result = await filterDigestMembersByCompliance(mockDb, [member], 'org_1');
    expect(result).toEqual([member]);
  });

  it('drops members whose only role lacks the compliance obligation', async () => {
    const member: DigestMember = {
      id: 'm2', role: 'auditor', department: null,
      user: { id: 'u2', name: 'B', email: 'b@x', role: null },
    };
    const result = await filterDigestMembersByCompliance(mockDb, [member], 'org_1');
    expect(result).toEqual([]);
  });

  it('drops platform admins even when member role has the obligation', async () => {
    const member: DigestMember = {
      id: 'm3', role: 'employee', department: 'it',
      user: { id: 'u3', name: 'C', email: 'c@x', role: 'admin' },
    };
    const result = await filterDigestMembersByCompliance(mockDb, [member], 'org_1');
    expect(result).toEqual([]);
  });

  it('resolves custom-role obligations via organizationRole lookup', async () => {
    mockDb.organizationRole.findMany.mockResolvedValueOnce([
      { name: 'contributor', obligations: { compliance: true } },
    ]);
    const keeper: DigestMember = {
      id: 'm4', role: 'contributor', department: 'hr',
      user: { id: 'u4', name: 'D', email: 'd@x', role: null },
    };
    const dropper: DigestMember = {
      id: 'm5', role: 'observer', department: 'hr',
      user: { id: 'u5', name: 'E', email: 'e@x', role: null },
    };
    const result = await filterDigestMembersByCompliance(
      mockDb,
      [keeper, dropper],
      'org_1',
    );
    expect(result.map((m) => m.id)).toEqual(['m4']);
  });
});
