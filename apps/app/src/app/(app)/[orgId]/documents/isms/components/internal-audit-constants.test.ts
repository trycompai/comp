import { describe, expect, it } from 'vitest';
import {
  auditValidationMessages,
  conclusionSentence,
  parseProgramme,
} from './internal-audit-constants';

describe('auditValidationMessages (clause 9.2 client mirror)', () => {
  it('requires at least one audit', () => {
    expect(auditValidationMessages({ audits: [] })).toEqual([
      'At least one internal audit must be recorded.',
    ]);
  });

  it('requires a conclusion verdict on completed audits only', () => {
    expect(
      auditValidationMessages({
        audits: [
          {
            reference: 'IA-2026-01',
            status: 'complete',
            conclusionVerdict: null,
          },
          {
            reference: 'IA-2026-02',
            status: 'planned',
            conclusionVerdict: null,
          },
        ],
      }),
    ).toEqual(['Audit IA-2026-01 is complete but has no conclusion verdict.']);
  });

  it('passes for a complete audit with a verdict', () => {
    expect(
      auditValidationMessages({
        audits: [
          {
            reference: 'IA-2026-01',
            status: 'complete',
            conclusionVerdict: 'conform',
          },
        ],
      }),
    ).toEqual([]);
  });
});

describe('conclusionSentence', () => {
  it('assembles the ticket template around the chosen verdict', () => {
    expect(conclusionSentence('conform')).toBe(
      'Overall, this audit found the ISMS to conform to ISO/IEC 27001:2022. Corrective actions are tracked in the findings table.',
    );
    expect(conclusionSentence('substantially_conform')).toContain(
      'substantially conform with the non-conformities recorded below',
    );
    expect(conclusionSentence('not_yet_conform')).toContain('not yet conform');
  });
});

describe('parseProgramme', () => {
  it('reads the programme out of a valid narrative', () => {
    expect(parseProgramme({ programme: 'Annual audit of the whole ISMS.' })).toBe(
      'Annual audit of the whole ISMS.',
    );
  });

  it('returns an empty string for missing or foreign narratives', () => {
    expect(parseProgramme(null)).toBe('');
    expect(parseProgramme({ statement: 'a leadership narrative' })).toBe('');
    expect(parseProgramme({ programme: 42 })).toBe('');
  });
});
