import { Impact, Likelihood, RiskTreatmentType, TaskStatus } from '@db';
import { describe, expect, it } from 'vitest';
import { suggestedResidual } from './suggested-residual';

const task = (status: TaskStatus) => ({ status });

describe('suggestedResidual', () => {
  it('accept: never moves from inherent regardless of completion', () => {
    const out = suggestedResidual({
      likelihood: Likelihood.very_likely,
      impact: Impact.severe,
      strategy: RiskTreatmentType.accept,
      tasks: [task(TaskStatus.done), task(TaskStatus.done)],
    });
    expect(out).toEqual({
      likelihood: Likelihood.very_likely,
      impact: Impact.severe,
      completion: 1,
    });
  });

  it('avoid with NO linked tasks stays at inherent (no operational evidence yet)', () => {
    const out = suggestedResidual({
      likelihood: Likelihood.likely,
      impact: Impact.major,
      strategy: RiskTreatmentType.avoid,
      tasks: [],
    });
    expect(out).toEqual({
      likelihood: Likelihood.likely,
      impact: Impact.major,
      completion: 0,
    });
  });

  it('avoid with linked tasks pins residual to (very_unlikely, insignificant)', () => {
    const out = suggestedResidual({
      likelihood: Likelihood.likely,
      impact: Impact.major,
      strategy: RiskTreatmentType.avoid,
      tasks: [task(TaskStatus.done), task(TaskStatus.todo)],
    });
    expect(out).toEqual({
      likelihood: Likelihood.very_unlikely,
      impact: Impact.insignificant,
      completion: 0.5,
    });
  });

  it('transfer at 100% drops impact by 1 step, leaves likelihood', () => {
    const out = suggestedResidual({
      likelihood: Likelihood.likely,
      impact: Impact.major,
      strategy: RiskTreatmentType.transfer,
      tasks: [task(TaskStatus.done), task(TaskStatus.done)],
    });
    expect(out.likelihood).toBe(Likelihood.likely);
    expect(out.impact).toBe(Impact.moderate);
    expect(out.completion).toBe(1);
  });

  it('mitigate at 100% drops both by 1 step', () => {
    const out = suggestedResidual({
      likelihood: Likelihood.likely,
      impact: Impact.major,
      strategy: RiskTreatmentType.mitigate,
      tasks: [task(TaskStatus.done)],
    });
    expect(out.likelihood).toBe(Likelihood.possible);
    expect(out.impact).toBe(Impact.moderate);
  });

  it('mitigate at 50% (1 of 2 tasks): floor(0.5) = 0 → no reduction', () => {
    const out = suggestedResidual({
      likelihood: Likelihood.likely,
      impact: Impact.major,
      strategy: RiskTreatmentType.mitigate,
      tasks: [task(TaskStatus.done), task(TaskStatus.todo)],
    });
    expect(out.likelihood).toBe(Likelihood.likely);
    expect(out.impact).toBe(Impact.major);
    expect(out.completion).toBe(0.5);
  });

  it('zero tasks: completion 0, no reduction', () => {
    const out = suggestedResidual({
      likelihood: Likelihood.possible,
      impact: Impact.moderate,
      strategy: RiskTreatmentType.mitigate,
      tasks: [],
    });
    expect(out.likelihood).toBe(Likelihood.possible);
    expect(out.impact).toBe(Impact.moderate);
    expect(out.completion).toBe(0);
  });

  it('already-minimum inherent: clamps at (very_unlikely, insignificant)', () => {
    const out = suggestedResidual({
      likelihood: Likelihood.very_unlikely,
      impact: Impact.insignificant,
      strategy: RiskTreatmentType.mitigate,
      tasks: [task(TaskStatus.done)],
    });
    expect(out.likelihood).toBe(Likelihood.very_unlikely);
    expect(out.impact).toBe(Impact.insignificant);
  });

  it('not_relevant tasks count as done for completion', () => {
    const out = suggestedResidual({
      likelihood: Likelihood.likely,
      impact: Impact.major,
      strategy: RiskTreatmentType.mitigate,
      tasks: [task(TaskStatus.done), task(TaskStatus.not_relevant)],
    });
    expect(out.completion).toBe(1);
    expect(out.likelihood).toBe(Likelihood.possible);
    expect(out.impact).toBe(Impact.moderate);
  });
});
