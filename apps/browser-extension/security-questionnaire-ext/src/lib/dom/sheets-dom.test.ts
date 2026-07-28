import { describe, expect, it } from 'vitest';
import { detectVisibleSheetQuestions } from './sheets-dom';

describe('visible Google Sheets grid detection', () => {
  it('extracts questions from accessible grid cells', () => {
    document.body.innerHTML = `
      <div role="grid">
        <div role="gridcell" aria-rowindex="1" aria-colindex="1">#</div>
        <div role="gridcell" aria-rowindex="1" aria-colindex="2">Question</div>
        <div role="gridcell" aria-rowindex="1" aria-colindex="3">Answer</div>
        <div role="gridcell" aria-rowindex="3" aria-colindex="2">Do you test backups?</div>
        <div role="gridcell" aria-rowindex="3" aria-colindex="3"></div>
      </div>
    `;

    const questions = detectVisibleSheetQuestions({
      root: document,
      location: { hash: '#gid=42' },
    });

    expect(questions).toEqual([
      {
        id: 'sheet:42:3:3',
        question: 'Do you test backups?',
        value: '',
        isEmpty: true,
        tag: 'sheets:B3->C3',
      },
    ]);
  });
});
