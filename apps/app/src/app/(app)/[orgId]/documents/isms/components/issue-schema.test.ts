import { describe, expect, it } from 'vitest';
import { issueSchema } from './issue-schema';

describe('issueSchema', () => {
  it('rejects whitespace-only required fields', () => {
    const result = issueSchema.safeParse({
      category: '   ',
      description: '   ',
      effect: '   ',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain('Category is required');
      expect(messages).toContain('Description is required');
      expect(messages).toContain('Effect is required');
    }
  });

  it('trims surrounding whitespace from valid input', () => {
    const result = issueSchema.safeParse({
      category: '  Governance  ',
      description: '  Limited awareness  ',
      effect: '  Human-error incidents  ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        category: 'Governance',
        description: 'Limited awareness',
        effect: 'Human-error incidents',
      });
    }
  });
});
