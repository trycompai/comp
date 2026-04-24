// Prevent PrismaClient construction during test import. The real Likelihood /
// Impact enums from @prisma/client are still re-exported so the schema can
// parse them natively.
jest.mock('@db', () => {
  const actual = jest.requireActual('@prisma/client');
  return {
    ...actual,
    db: {},
  };
});

import { Impact, Likelihood } from '@db';
import { assessmentOutputSchema } from './vendor-risk-assessment-task';

describe('assessmentOutputSchema', () => {
  it('accepts independent likelihood and impact combinations across the full matrix', () => {
    const offDiagonal = assessmentOutputSchema.safeParse({
      likelihood: 'very_likely',
      impact: 'insignificant',
      rationale: 'Motivated adversary but public-only data.',
    });
    expect(offDiagonal.success).toBe(true);
    if (offDiagonal.success) {
      expect(offDiagonal.data.likelihood).toBe(Likelihood.very_likely);
      expect(offDiagonal.data.impact).toBe(Impact.insignificant);
    }
  });

  it('accepts every enum value on each dimension', () => {
    const likelihoods: Likelihood[] = [
      Likelihood.very_unlikely,
      Likelihood.unlikely,
      Likelihood.possible,
      Likelihood.likely,
      Likelihood.very_likely,
    ];
    const impacts: Impact[] = [
      Impact.insignificant,
      Impact.minor,
      Impact.moderate,
      Impact.major,
      Impact.severe,
    ];
    for (const likelihood of likelihoods) {
      for (const impact of impacts) {
        const result = assessmentOutputSchema.safeParse({
          likelihood,
          impact,
          rationale: 'test rationale long enough.',
        });
        expect(result.success).toBe(true);
      }
    }
  });

  it('rejects a missing dimension', () => {
    const missingImpact = assessmentOutputSchema.safeParse({
      likelihood: 'possible',
      rationale: 'missing impact on purpose.',
    });
    expect(missingImpact.success).toBe(false);
  });

  it('rejects out-of-enum values', () => {
    const result = assessmentOutputSchema.safeParse({
      likelihood: 'sometimes',
      impact: 'catastrophic',
      rationale: 'garbage in.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects too-short rationale', () => {
    const result = assessmentOutputSchema.safeParse({
      likelihood: 'possible',
      impact: 'moderate',
      rationale: 'short',
    });
    expect(result.success).toBe(false);
  });
});
