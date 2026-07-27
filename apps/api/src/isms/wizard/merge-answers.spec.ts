import { mergeWizardAnswers } from './merge-answers';

describe('mergeWizardAnswers', () => {
  it('shallow-merges nested objects without clobbering siblings', () => {
    const merged = mergeWizardAnswers({
      stored: { insurance: { has: true, insurerName: 'Acme' } },
      incoming: { insurance: { insurerName: 'Beta' } },
    });
    expect(merged.insurance).toEqual({ has: true, insurerName: 'Beta' });
  });

  it('replaces scalars and arrays wholesale', () => {
    const merged = mergeWizardAnswers({
      stored: {
        certificationBody: 'BSI',
        sectorRegulators: ['FINMA'],
      },
      incoming: { sectorRegulators: ['FCA', 'HIPAA'] },
    });
    expect(merged.certificationBody).toBe('BSI');
    expect(merged.sectorRegulators).toEqual(['FCA', 'HIPAA']);
  });

  it('ignores undefined incoming fields', () => {
    const merged = mergeWizardAnswers({
      stored: { hasContractors: true },
      incoming: { hasContractors: undefined },
    });
    expect(merged.hasContractors).toBe(true);
  });

  it('does not mutate the stored input', () => {
    const stored = { insurance: { has: false, insurerName: '' } };
    mergeWizardAnswers({
      stored,
      incoming: { insurance: { has: true } },
    });
    expect(stored.insurance.has).toBe(false);
  });

  it('seeds a nested object that did not exist before', () => {
    const merged = mergeWizardAnswers({
      stored: {},
      incoming: { deputySpo: { toBeNamed: true } },
    });
    expect(merged.deputySpo).toEqual({ toBeNamed: true });
  });
});
