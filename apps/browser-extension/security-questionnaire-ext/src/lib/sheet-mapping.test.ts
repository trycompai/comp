import { describe, expect, it } from 'vitest';
import {
  alignSheetMappingToQuestions,
  inferSheetMappingFromQuestions,
  parseSheetIdentity,
  parseSheetMapping,
} from './sheet-mapping';
import type { DetectedQuestion } from './types';

describe('sheet mapping helpers', () => {
  it('parses a spreadsheet identity from a Google Sheets URL shape', () => {
    expect(parseSheetIdentity({
      pathname: '/spreadsheets/d/sheet_123/edit',
      hash: '#gid=456',
    })).toEqual({
      spreadsheetId: 'sheet_123',
      gid: '456',
    });
  });

  it('infers columns and row range from detected sheet tags', () => {
    const questions: DetectedQuestion[] = [
      question({ tag: 'sheets:D12->H12' }),
      question({ tag: 'sheets:D14->H14' }),
    ];

    expect(inferSheetMappingFromQuestions({
      identity: { spreadsheetId: 'sheet_abc', gid: '7' },
      questions,
    })).toMatchObject({
      spreadsheetId: 'sheet_abc',
      gid: '7',
      questionColumn: 'D',
      answerColumn: 'H',
      startRow: 12,
      endRow: 14,
      source: 'auto',
      confirmed: false,
    });
  });

  it('normalizes and validates stored mapping objects', () => {
    expect(parseSheetMapping({
      spreadsheetId: 'sheet_abc',
      gid: '0',
      questionColumn: 'aa',
      answerColumn: 'ab',
      startRow: 5,
      endRow: null,
      source: 'manual',
      confirmed: true,
      updatedAt: 1,
    })).toMatchObject({
      questionColumn: 'AA',
      answerColumn: 'AB',
    });

    expect(parseSheetMapping({
      spreadsheetId: 'sheet_abc',
      gid: '0',
      questionColumn: 'B',
      answerColumn: 'C',
      startRow: 8,
      endRow: 2,
      source: 'manual',
      confirmed: true,
      updatedAt: 1,
    })).toBeNull();
  });

  it('aligns a saved mapping to the first detected question row', () => {
    const aligned = alignSheetMappingToQuestions({
      mapping: {
        spreadsheetId: 'sheet_abc',
        gid: '0',
        questionColumn: 'B',
        answerColumn: 'C',
        startRow: 2,
        endRow: null,
        source: 'manual',
        confirmed: true,
        updatedAt: 1,
      },
      questions: [
        question({ tag: 'sheets:B3->C3' }),
        question({ tag: 'sheets:B4->C4' }),
      ],
    });

    expect(aligned).toMatchObject({
      questionColumn: 'B',
      answerColumn: 'C',
      startRow: 3,
      endRow: null,
      source: 'manual',
      confirmed: true,
    });
  });
});

function question(params: { tag: string }): DetectedQuestion {
  return {
    id: params.tag,
    question: 'Do you encrypt data at rest?',
    value: '',
    isEmpty: true,
    tag: params.tag,
  };
}
