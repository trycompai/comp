import { describe, expect, it } from 'vitest';
import { filterFindingsByConnection } from './finding-filters';

type TestFinding = {
  connectionId: string;
  providerSlug: string;
  title: string;
};

const findings: TestFinding[] = [
  { connectionId: 'aws-acct-a', providerSlug: 'aws', title: 'a-1' },
  { connectionId: 'aws-acct-a', providerSlug: 'aws', title: 'a-2' },
  { connectionId: 'aws-acct-b', providerSlug: 'aws', title: 'b-1' },
  { connectionId: 'gcp-conn-1', providerSlug: 'gcp', title: 'g-1' },
];

describe('filterFindingsByConnection', () => {
  it('returns only the selected connection (account) findings', () => {
    const result = filterFindingsByConnection(findings, 'aws-acct-a');
    expect(result.map((f) => f.title)).toEqual(['a-1', 'a-2']);
  });

  it('does NOT leak findings from another account of the same provider (the bug)', () => {
    // Regression guard: the old `providerSlug === providerSlug || ...` filter
    // returned every AWS finding regardless of the selected account.
    const result = filterFindingsByConnection(findings, 'aws-acct-b');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('b-1');
    expect(result.some((f) => f.connectionId === 'aws-acct-a')).toBe(false);
  });

  it('scopes to a single connection across providers', () => {
    expect(filterFindingsByConnection(findings, 'gcp-conn-1').map((f) => f.title)).toEqual([
      'g-1',
    ]);
  });

  it('returns an empty array when no finding matches the connection', () => {
    expect(filterFindingsByConnection(findings, 'does-not-exist')).toEqual([]);
  });
});
