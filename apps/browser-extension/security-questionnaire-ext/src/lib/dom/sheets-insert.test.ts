import { describe, expect, it } from 'vitest';
import { buildSheetPastePlan } from '../sheets-paste-plan';

describe('Google Sheets paste plan', () => {
  it('builds a target range and TSV for contiguous answer cells', () => {
    const plan = buildSheetPastePlan([
      { fieldId: 'sheet:123:2:3', answer: 'First answer' },
      { fieldId: 'sheet:123:3:3', answer: 'Second answer' },
    ]);

    expect(plan?.range).toBe('C2:C3');
    expect(plan?.tsv).toBe('First answer\nSecond answer');
    expect(plan?.targetIds).toEqual(['sheet:123:2:3', 'sheet:123:3:3']);
  });

  it('keeps blank rows when approved sheet answers are not contiguous', () => {
    const plan = buildSheetPastePlan([
      { fieldId: 'sheet:123:2:3', answer: 'First answer' },
      { fieldId: 'sheet:123:4:3', answer: 'Third answer' },
    ]);

    expect(plan?.range).toBe('C2:C4');
    expect(plan?.tsv).toBe('First answer\n\nThird answer');
  });
});
