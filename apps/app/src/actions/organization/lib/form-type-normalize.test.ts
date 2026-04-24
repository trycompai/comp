import { describe, expect, it } from 'vitest';
import { normalizeFormType } from './form-type-normalize';

describe('normalizeFormType', () => {
  it('converts backfilled hyphenated DB values to underscored Prisma enum keys', () => {
    expect(normalizeFormType('infrastructure-inventory')).toBe('infrastructure_inventory');
    expect(normalizeFormType('access-request')).toBe('access_request');
    expect(normalizeFormType('penetration-test')).toBe('penetration_test');
    expect(normalizeFormType('board-meeting')).toBe('board_meeting');
    expect(normalizeFormType('tabletop-exercise')).toBe('tabletop_exercise');
    expect(normalizeFormType('network-diagram')).toBe('network_diagram');
  });

  it('passes through already-underscored values unchanged (newer manifests)', () => {
    expect(normalizeFormType('infrastructure_inventory')).toBe('infrastructure_inventory');
    expect(normalizeFormType('meeting')).toBe('meeting');
  });

  it('is idempotent', () => {
    const once = normalizeFormType('employee-performance-evaluation');
    const twice = normalizeFormType(once);
    expect(twice).toBe('employee_performance_evaluation');
    expect(twice).toBe(once);
  });

  it('replaces every hyphen, not just the first', () => {
    expect(normalizeFormType('a-b-c-d')).toBe('a_b_c_d');
  });
});
