import { describe, expect, it } from 'vitest';
import { buildSheetPastePlan } from './sheets-paste-plan';

function planFor(answer: string): string {
  const plan = buildSheetPastePlan([{ fieldId: 'sheet:0:2:3', answer }]);
  if (!plan) throw new Error('Expected a paste plan');
  return plan.tsv;
}

describe('buildSheetPastePlan', () => {
  it('keeps ordinary answers untouched', () => {
    expect(planFor('We encrypt customer data at rest.')).toBe(
      'We encrypt customer data at rest.',
    );
  });

  it.each(['=', '+', '-', '@'])(
    'prevents Sheets from evaluating answers starting with "%s"',
    (prefix) => {
      expect(planFor(`${prefix}Yes, we do`)).toBe(`'${prefix}Yes, we do`);
    },
  );

  it('neutralizes a leading formula character after whitespace is trimmed', () => {
    expect(planFor('  =SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
  });

  it('flattens newlines and tabs into single cells', () => {
    expect(planFor('First line\nsecond\tline')).toBe('First line second line');
  });

  it('rejects zero row or column, which are not valid A1 coordinates', () => {
    expect(buildSheetPastePlan([{ fieldId: 'sheet:0:0:3', answer: 'x' }])).toBeNull();
    expect(buildSheetPastePlan([{ fieldId: 'sheet:0:3:0', answer: 'x' }])).toBeNull();
  });

  it('leaves empty cells empty rather than quoting them', () => {
    const plan = buildSheetPastePlan([
      { fieldId: 'sheet:0:1:1', answer: 'yes' },
      { fieldId: 'sheet:0:1:3', answer: 'no' },
    ]);
    expect(plan?.tsv).toBe('yes\t\tno');
  });
});
