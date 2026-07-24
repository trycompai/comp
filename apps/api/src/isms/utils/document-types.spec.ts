import { ISMS_TYPE_DEFINITIONS, matchRequirementId } from './document-types';

describe('ISMS_TYPE_DEFINITIONS', () => {
  it('defines all twelve foundational document types with clauses', () => {
    expect(ISMS_TYPE_DEFINITIONS).toHaveLength(12);
    const types = ISMS_TYPE_DEFINITIONS.map((d) => d.type);
    expect(types).toEqual(
      expect.arrayContaining([
        'context_of_organization',
        'interested_parties_register',
        'interested_parties_requirements',
        'isms_scope',
        'leadership_commitment',
        'roles_and_responsibilities',
        'risk_assessment_methodology',
        'risk_treatment_plan',
        'objectives_plan',
        'monitoring',
        'internal_audit',
        'management_review',
      ]),
    );
  });

  it('maps monitoring to clause 9.1', () => {
    const monitoring = ISMS_TYPE_DEFINITIONS.find(
      (d) => d.type === 'monitoring',
    );
    expect(monitoring?.clause).toBe('9.1');
  });

  it('maps internal_audit to clause 9.2', () => {
    const internalAudit = ISMS_TYPE_DEFINITIONS.find(
      (d) => d.type === 'internal_audit',
    );
    expect(internalAudit?.clause).toBe('9.2');
  });

  it('maps management_review to clause 9.3', () => {
    const managementReview = ISMS_TYPE_DEFINITIONS.find(
      (d) => d.type === 'management_review',
    );
    expect(managementReview?.clause).toBe('9.3');
  });

  it('maps 4.2 to both interested-parties documents', () => {
    const clause42 = ISMS_TYPE_DEFINITIONS.filter((d) => d.clause === '4.2');
    expect(clause42.map((d) => d.type)).toEqual([
      'interested_parties_register',
      'interested_parties_requirements',
    ]);
  });
});

describe('matchRequirementId', () => {
  const requirements = [
    {
      id: 'req-41',
      name: '4.1 Understanding the organization',
      identifier: '4.1',
    },
    { id: 'req-42', name: '4.2 Interested parties', identifier: '4.2' },
    { id: 'req-141', name: '14.1 Security in development', identifier: '14.1' },
  ];

  it('matches an exact clause identifier', () => {
    expect(matchRequirementId({ clause: '4.1', requirements })).toBe('req-41');
  });

  it('does not confuse 4.1 with 14.1', () => {
    expect(matchRequirementId({ clause: '4.1', requirements })).not.toBe(
      'req-141',
    );
  });

  it('matches via the name when identifier is empty', () => {
    expect(
      matchRequirementId({
        clause: '5.1',
        requirements: [
          { id: 'req-51', name: '5.1 Leadership', identifier: '' },
        ],
      }),
    ).toBe('req-51');
  });

  it('returns null when no requirement matches', () => {
    expect(matchRequirementId({ clause: '6.2', requirements })).toBeNull();
  });

  it('does not match a clause that is a prefix of another (4.1 vs 4.11)', () => {
    expect(
      matchRequirementId({
        clause: '4.1',
        requirements: [
          { id: 'req-411', name: '4.11 Other', identifier: '4.11' },
        ],
      }),
    ).toBeNull();
  });
});
