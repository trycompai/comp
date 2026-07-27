import { describe, expect, it } from 'vitest';
import { requirementSchema } from './requirement-schema';

describe('requirementSchema', () => {
  it('rejects whitespace-only required fields', () => {
    const result = requirementSchema.safeParse({
      partyName: '   ',
      requirement: '   ',
      treatment: '   ',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain('Interested party is required');
      expect(messages).toContain('Requirement is required');
      expect(messages).toContain('ISMS treatment is required');
    }
  });

  it('trims surrounding whitespace from valid input', () => {
    const result = requirementSchema.safeParse({
      partyName: '  Regulators  ',
      requirement: '  Annual reporting  ',
      treatment: '  Compliance program  ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.partyName).toBe('Regulators');
      expect(result.data.requirement).toBe('Annual reporting');
      expect(result.data.treatment).toBe('Compliance program');
    }
  });
});
