import { describe, expect, it } from 'vitest';

import {
  computePendingPolicies,
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
