import { describe, expect, it } from 'vitest';
import { comparePoliciesByName } from './policy-name-sort';

describe('comparePoliciesByName', () => {
  it('sorts policy names alphabetically without case sensitivity', () => {
    const policies = [
      { id: '2', name: 'zebra policy' },
      { id: '3', name: 'Alpha policy' },
      { id: '1', name: 'beta policy' },
    ];

    const sorted = [...policies].sort(comparePoliciesByName);

    expect(sorted.map((policy) => policy.name)).toEqual([
      'Alpha policy',
      'beta policy',
      'zebra policy',
    ]);
  });

  it('falls back to deterministic ordering when names only differ by case', () => {
    const policies = [
      { id: 'b', name: 'Policy' },
      { id: 'a', name: 'policy' },
      { id: 'c', name: 'policy' },
    ];

    const sorted = [...policies].sort(comparePoliciesByName);

    expect(sorted.map((policy) => policy.id)).toEqual(['a', 'b', 'c']);
  });
});
