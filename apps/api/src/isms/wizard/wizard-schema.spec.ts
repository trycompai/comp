import {
  parseStoredAnswers,
  partialWizardAnswersSchema,
  saveWizardProfileSchema,
  wizardAnswersSchema,
} from './wizard-schema';

const fullAnswers = {
  deputySpo: { memberId: 'mem_1', toBeNamed: false },
  internalAuditApproach: 'in_house' as const,
  certificationBody: 'BSI',
  insurance: { has: true, insurerName: 'Acme Cyber' },
  sectorRegulators: ['FINMA', 'custom:Local Authority'],
  hasContractors: true,
  capabilitiesInProduction: ['Payments API'],
  cloudScopeSplit: { customer: ['Data'], provider: ['Infrastructure'] },
  euRep: { status: 'appointed' as const, name: 'EU Rep Ltd' },
  certificateScopeSentence: 'The ISMS covers everything.',
  objectives: [{ objective: 'Stay certified', target: '100%' }],
  intendedOutcomes: ['Protect data'],
};

describe('wizardAnswersSchema (full)', () => {
  it('accepts a fully-populated answers object', () => {
    expect(wizardAnswersSchema.safeParse(fullAnswers).success).toBe(true);
  });

  it('rejects a missing required field on completion', () => {
    const { certificationBody, ...rest } = fullAnswers;
    expect(wizardAnswersSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an invalid enum value', () => {
    expect(
      wizardAnswersSchema.safeParse({
        ...fullAnswers,
        internalAuditApproach: 'guesswork',
      }).success,
    ).toBe(false);
  });

  it('allows null internalAuditApproach', () => {
    expect(
      wizardAnswersSchema.safeParse({
        ...fullAnswers,
        internalAuditApproach: null,
      }).success,
    ).toBe(true);
  });
});

describe('partialWizardAnswersSchema (incremental save)', () => {
  it('accepts an empty object', () => {
    expect(partialWizardAnswersSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a single-step payload', () => {
    const parsed = partialWizardAnswersSchema.safeParse({
      insurance: { has: true, insurerName: 'X' },
    });
    expect(parsed.success).toBe(true);
  });

  it('still validates types within a partial payload', () => {
    expect(
      partialWizardAnswersSchema.safeParse({ hasContractors: 'yes' }).success,
    ).toBe(false);
  });
});

describe('saveWizardProfileSchema', () => {
  it('requires a frameworkId', () => {
    expect(
      saveWizardProfileSchema.safeParse({ answers: {} }).success,
    ).toBe(false);
  });

  it('accepts frameworkId + partial answers + complete flag', () => {
    const parsed = saveWizardProfileSchema.safeParse({
      frameworkId: 'fw_1',
      answers: { certificationBody: 'BSI' },
      complete: true,
    });
    expect(parsed.success).toBe(true);
  });
});

describe('parseStoredAnswers', () => {
  it('returns {} for malformed input', () => {
    expect(parseStoredAnswers('not-json')).toEqual({});
    expect(parseStoredAnswers(null)).toEqual({});
    expect(parseStoredAnswers(undefined)).toEqual({});
  });

  it('returns the parsed partial answers for valid input', () => {
    expect(parseStoredAnswers({ hasContractors: true })).toEqual({
      hasContractors: true,
    });
  });
});
