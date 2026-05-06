import { describe, expect, it, jest } from '@jest/globals';

// Mock @db before importing the helper so we don't pull in the real Prisma
// client (which requires DATABASE_URL at module load).
jest.mock('@db', () => ({
  RiskTreatmentType: {
    accept: 'accept',
    avoid: 'avoid',
    mitigate: 'mitigate',
    transfer: 'transfer',
  },
}));

import { RiskTreatmentType } from '@db';
import { resolveStrategyDescriptionUpdate } from './strategy-descriptions';

const baseExisting = {
  treatmentStrategy: RiskTreatmentType.mitigate,
  treatmentStrategyDescription: 'Current mitigate plan',
  strategyDescriptions: {} as unknown,
};

describe('resolveStrategyDescriptionUpdate', () => {
  it('returns empty when neither strategy nor description is changing', () => {
    expect(resolveStrategyDescriptionUpdate(baseExisting, {})).toEqual({});
    expect(
      resolveStrategyDescriptionUpdate(baseExisting, { assigneeId: 'mbr_1' } as never),
    ).toEqual({});
  });

  it('on strategy change: saves current description into the OLD slot', () => {
    const result = resolveStrategyDescriptionUpdate(baseExisting, {
      treatmentStrategy: RiskTreatmentType.accept,
    });
    expect(result.treatmentStrategy).toBe(RiskTreatmentType.accept);
    expect(result.strategyDescriptions).toEqual({
      mitigate: 'Current mitigate plan',
    });
    // Active text becomes empty (no Accept rationale saved yet)
    expect(result.treatmentStrategyDescription).toBeNull();
  });

  it('on strategy change: loads NEW strategy slot into active text when present', () => {
    const result = resolveStrategyDescriptionUpdate(
      {
        ...baseExisting,
        strategyDescriptions: {
          accept: 'We accept this risk because of cost-benefit analysis.',
        },
      },
      { treatmentStrategy: RiskTreatmentType.accept },
    );
    expect(result.treatmentStrategyDescription).toBe(
      'We accept this risk because of cost-benefit analysis.',
    );
    // Mitigate plan still preserved in the map
    expect(result.strategyDescriptions).toEqual({
      mitigate: 'Current mitigate plan',
      accept: 'We accept this risk because of cost-benefit analysis.',
    });
  });

  it('on description change without strategy change: mirrors into active strategy slot', () => {
    const result = resolveStrategyDescriptionUpdate(baseExisting, {
      treatmentStrategyDescription: 'Updated mitigate plan',
    });
    expect(result.treatmentStrategy).toBeUndefined();
    expect(result.treatmentStrategyDescription).toBe('Updated mitigate plan');
    expect(result.strategyDescriptions).toEqual({
      mitigate: 'Updated mitigate plan',
    });
  });

  it('on both change: explicit description wins as the new active text', () => {
    const result = resolveStrategyDescriptionUpdate(
      {
        ...baseExisting,
        strategyDescriptions: {
          accept: 'Old accept rationale',
        },
      },
      {
        treatmentStrategy: RiskTreatmentType.accept,
        treatmentStrategyDescription: 'Brand-new accept rationale',
      },
    );
    expect(result.treatmentStrategy).toBe(RiskTreatmentType.accept);
    expect(result.treatmentStrategyDescription).toBe('Brand-new accept rationale');
    expect(result.strategyDescriptions).toEqual({
      mitigate: 'Current mitigate plan',
      accept: 'Brand-new accept rationale',
    });
  });

  it('clears the slot when description is set to empty', () => {
    const result = resolveStrategyDescriptionUpdate(
      {
        ...baseExisting,
        strategyDescriptions: { mitigate: 'old text' },
      },
      { treatmentStrategyDescription: '' },
    );
    expect(result.strategyDescriptions).toEqual({});
  });

  it('handles malformed strategyDescriptions gracefully', () => {
    const result = resolveStrategyDescriptionUpdate(
      { ...baseExisting, strategyDescriptions: 'not an object' as unknown },
      { treatmentStrategy: RiskTreatmentType.accept },
    );
    // Falls back to empty map; saves current Mitigate text
    expect(result.strategyDescriptions).toEqual({
      mitigate: 'Current mitigate plan',
    });
  });

  it('does not save an empty old description into the slot', () => {
    const result = resolveStrategyDescriptionUpdate(
      { ...baseExisting, treatmentStrategyDescription: '' },
      { treatmentStrategy: RiskTreatmentType.accept },
    );
    expect(result.strategyDescriptions).toEqual({});
  });
});
