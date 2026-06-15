import { describe, expect, it } from 'vitest';
import { objectiveSchema } from './objective-schema';
import { OBJECTIVE_STATUSES } from './objectives-status';

const baseObjective = {
  target: '',
  ownerMemberId: '',
  cadence: '',
  plan: '',
  measurementMethod: '',
  status: OBJECTIVE_STATUSES[0],
};

describe('objectiveSchema', () => {
  it('rejects a whitespace-only objective', () => {
    const result = objectiveSchema.safeParse({ ...baseObjective, objective: '   ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain('Objective is required');
    }
  });

  it('trims surrounding whitespace from a valid objective', () => {
    const result = objectiveSchema.safeParse({
      ...baseObjective,
      objective: '  Reduce incident rate  ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.objective).toBe('Reduce incident rate');
    }
  });
});
