import { describe, expect, it } from 'vitest';
import {
  FRAMEWORK_FAMILY_STATUSES,
  getFamilyStatusClassName,
  getFamilyStatusLabel,
} from './family-status';

describe('framework family status', () => {
  it('exposes the four statuses in dropdown order', () => {
    expect(FRAMEWORK_FAMILY_STATUSES.map((s) => s.value)).toEqual([
      'visible',
      'hidden',
      'under_construction',
      'partial',
    ]);
  });

  it('labels statuses for display', () => {
    expect(getFamilyStatusLabel('visible')).toBe('Visible');
    expect(getFamilyStatusLabel('hidden')).toBe('Hidden');
    expect(getFamilyStatusLabel('under_construction')).toBe('Under Construction');
    expect(getFamilyStatusLabel('partial')).toBe('Partial');
  });

  // The exact color rules Joe specified in the ticket.
  it('color-codes visible green with white text', () => {
    const cls = getFamilyStatusClassName('visible');
    expect(cls).toContain('bg-green-600');
    expect(cls).toContain('text-white');
  });

  it('color-codes hidden black', () => {
    expect(getFamilyStatusClassName('hidden')).toContain('bg-black');
  });

  it('color-codes under construction red', () => {
    expect(getFamilyStatusClassName('under_construction')).toContain('bg-red-600');
  });

  it('color-codes partial amber', () => {
    expect(getFamilyStatusClassName('partial')).toContain('bg-amber-500');
  });
});
