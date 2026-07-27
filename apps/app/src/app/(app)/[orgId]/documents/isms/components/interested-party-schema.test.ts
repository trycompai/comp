import { describe, expect, it } from 'vitest';
import { interestedPartySchema } from './interested-party-schema';

describe('interestedPartySchema', () => {
  it('rejects whitespace-only required fields', () => {
    const result = interestedPartySchema.safeParse({
      name: '   ',
      category: '   ',
      needsExpectations: '   ',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain('Name is required');
      expect(messages).toContain('Category is required');
      expect(messages).toContain('Needs & expectations are required');
    }
  });

  it('trims surrounding whitespace from valid input', () => {
    const result = interestedPartySchema.safeParse({
      name: '  Customers  ',
      category: '  External  ',
      needsExpectations: '  Reliable service  ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: 'Customers',
        category: 'External',
        needsExpectations: 'Reliable service',
      });
    }
  });
});
