import { describe, expect, it } from 'vitest';
import { detectSheetQuestions, tableToQuestions } from './sheets-detection';
import type { SheetMapping } from '../types';

describe('Google Sheets mapped detection', () => {
  it('rescans saved sheet columns when the stored start row skips contiguous rows', () => {
    const questions = tableToQuestions({
      gid: '0',
      mapping: {
        questionColumn: 'B',
        answerColumn: 'C',
        startRow: 5,
        endRow: null,
      },
      table: {
        cols: [{ label: '#' }, { label: 'Question' }, { label: 'Answer' }],
        rows: [
          row(['#', 'Question', 'Answer']),
          row(['', '', '']),
          row(['1', 'Encryption at rest', '']),
          row(['2', 'SAML SSO support', '']),
          row(['3', 'Quarterly access reviews', '']),
        ],
      },
    });

    expect(questions.map((question) => question.tag)).toEqual([
      'sheets:B3->C3',
      'sheets:B4->C4',
      'sheets:B5->C5',
    ]);
  });

  it('keeps the saved start row when earlier detected rows are separated', () => {
    const questions = tableToQuestions({
      gid: '0',
      mapping: {
        questionColumn: 'B',
        answerColumn: 'C',
        startRow: 4,
        endRow: null,
      },
      table: {
        cols: [{ label: '#' }, { label: 'Question' }, { label: 'Answer' }],
        rows: [
          row(['#', 'Question', 'Answer']),
          row(['', 'Onboarding help', '']),
          row(['', '', '']),
          row(['1', 'Encryption at rest', '']),
          row(['2', 'Audit log monitoring', '']),
        ],
      },
    });

    expect(questions.map((question) => question.tag)).toEqual([
      'sheets:B4->C4',
      'sheets:B5->C5',
    ]);
  });

  it('accepts short statement-style rows under a saved open-ended mapping', () => {
    const questions = tableToQuestions({
      gid: '0',
      mapping: {
        questionColumn: 'B',
        answerColumn: 'C',
        startRow: 4,
        endRow: null,
      },
      table: {
        cols: [{ label: '#' }, { label: 'Requirement' }, { label: 'Response' }],
        rows: [
          row(['#', 'Requirement', 'Response']),
          row(['', '', '']),
          row(['1', 'MFA', '']),
          row(['2', 'SCIM', '']),
        ],
      },
    });

    expect(questions.map((question) => question.question)).toEqual(['MFA', 'SCIM']);
    expect(questions.map((question) => question.tag)).toEqual([
      'sheets:B3->C3',
      'sheets:B4->C4',
    ]);
  });

  it('uses explicit finite sheet mapping for custom columns and rows', () => {
    const questions = tableToQuestions({
      gid: '0',
      mapping: {
        questionColumn: 'D',
        answerColumn: 'H',
        startRow: 4,
        endRow: 5,
      },
      table: {
        cols: Array.from({ length: 8 }, (_value, index) => ({
          label: String.fromCharCode(65 + index),
        })),
        rows: [
          row(['Section', '', '', 'Question', '', '', '', 'Answer']),
          row(['', '', '', 'Ignored intro text', '', '', '', '']),
          row(['', '', '', 'Ignored because start row is 4', '', '', '', '']),
          row(['', '', '', 'Encryption databases', '', '', '', 'Yes']),
          row(['', '', '', 'SCIM provisioning', '', '', '', '']),
        ],
      },
    });

    expect(questions).toEqual([
      {
        id: 'sheet:0:4:8',
        question: 'Encryption databases',
        value: 'Yes',
        isEmpty: false,
        tag: 'sheets:D4->H4',
      },
      {
        id: 'sheet:0:5:8',
        question: 'SCIM provisioning',
        value: '',
        isEmpty: true,
        tag: 'sheets:D5->H5',
      },
    ]);
  });

  it('prefers csv endpoints when explicit mapping is present', async () => {
    const requestedUrls: string[] = [];
    const mapping: SheetMapping = {
      spreadsheetId: 'sheet_csv',
      gid: '789',
      questionColumn: 'B',
      answerColumn: 'C',
      startRow: 2,
      endRow: null,
      source: 'manual',
      confirmed: true,
      updatedAt: 1,
    };
    const questions = await detectSheetQuestions({
      location: {
        hash: '#gid=789',
        pathname: '/spreadsheets/d/sheet_csv/edit',
      },
      mapping,
      fetcher: async (url) => {
        requestedUrls.push(url);
        return {
          ok: true,
          text: async () => '#,Question,Answer\n1,Do you review access?,',
        };
      },
    });

    expect(requestedUrls[0]).toContain('tqx=out:csv');
    expect(questions[0]?.tag).toBe('sheets:B2->C2');
  });
});

function row(values: string[]): { c: { v: string }[] } {
  return {
    c: values.map((value) => ({ v: value })),
  };
}
