import { describe, expect, it } from 'vitest';
import { detectSheetQuestions, tableToQuestions } from './sheets-detection';

describe('Google Sheets detection', () => {
  it('extracts questions from a Question column and targets Answer cells', () => {
    const questions = tableToQuestions({
      gid: '0',
      table: {
        cols: [{ label: '#' }, { label: 'Question' }, { label: 'Answer' }],
        rows: [
          { c: [{ v: 1 }, { v: 'Do you encrypt data at rest?' }, null] },
          { c: [{ v: 2 }, { v: 'Do you support SSO?' }, { v: 'Yes' }] },
        ],
      },
    });

    expect(questions).toEqual([
      {
        id: 'sheet:0:2:3',
        question: 'Do you encrypt data at rest?',
        value: '',
        isEmpty: true,
        tag: 'sheets:B2->C2',
      },
      {
        id: 'sheet:0:3:3',
        question: 'Do you support SSO?',
        value: 'Yes',
        isEmpty: false,
        tag: 'sheets:B3->C3',
      },
    ]);
  });

  it('extracts statement-style requirements from mapped headers', () => {
    const questions = tableToQuestions({
      gid: '0',
      table: {
        cols: [{ label: '#' }, { label: 'Requirement' }, { label: 'Response' }],
        rows: [
          { c: [{ v: 1 }, { v: 'MFA' }, null] },
          { c: [{ v: 2 }, { v: 'Encryption at rest' }, { v: 'Enabled' }] },
        ],
      },
    });

    expect(questions).toEqual([
      {
        id: 'sheet:0:2:3',
        question: 'MFA',
        value: '',
        isEmpty: true,
        tag: 'sheets:B2->C2',
      },
      {
        id: 'sheet:0:3:3',
        question: 'Encryption at rest',
        value: 'Enabled',
        isEmpty: false,
        tag: 'sheets:B3->C3',
      },
    ]);
  });

  it('falls back to gviz json with the active gid', async () => {
    const response = [
      'google.visualization.Query.setResponse(',
      JSON.stringify({
        table: {
          cols: [{ label: 'Question' }, { label: 'Answer' }],
          rows: [{ c: [{ v: 'Do you review access quarterly?' }, null] }],
        },
      }),
      ');',
    ].join('');

    const questions = await detectSheetQuestions({
      location: {
        hash: '#gid=123',
        pathname: '/spreadsheets/d/sheet_abc/edit',
      },
      fetcher: async (url) => {
        if (url.includes('tqx=out:csv') || url.includes('/export?')) {
          return { ok: true, text: async () => '{"status":"error"}' };
        }
        return { ok: true, text: async () => response };
      },
    });

    expect(questions[0]?.id).toBe('sheet:123:2:2');
  });

  it('preserves physical row numbers when blank rows precede questions', async () => {
    const questions = await detectSheetQuestions({
      location: {
        hash: '#gid=321',
        pathname: '/spreadsheets/d/sheet_blank_row/edit',
      },
      fetcher: async () => ({
        ok: true,
        text: async () => [
          'Question,Answer',
          ',',
          'Do you encrypt production data?,',
        ].join('\n'),
      }),
    });

    expect(questions[0]?.id).toBe('sheet:321:3:2');
    expect(questions[0]?.tag).toBe('sheets:A3->B3');
  });

  it('falls back to csv export when gviz does not return a table', async () => {
    const requestedUrls: string[] = [];
    const questions = await detectSheetQuestions({
      location: {
        hash: '#gid=456',
        pathname: '/spreadsheets/d/sheet_xyz/edit',
      },
      fetcher: async (url) => {
        requestedUrls.push(url);
        if (url.includes('/gviz/tq')) {
          return { ok: true, text: async () => '{"status":"error"}' };
        }
        return {
          ok: true,
          text: async () => [
            '#,Question,Answer',
            '1,Do you encrypt production data?,',
            '2,Do you support SAML SSO?,Yes',
          ].join('\n'),
        };
      },
    });

    expect(requestedUrls).toHaveLength(2);
    expect(requestedUrls[0]).toContain('tqx=out:csv');
    expect(requestedUrls[1]).toContain('/export?format=csv&id=sheet_xyz&gid=456');
    expect(questions.map((question) => question.tag)).toEqual([
      'sheets:B2->C2',
      'sheets:B3->C3',
    ]);
  });

  it('uses gviz csv before export csv', async () => {
    const requestedUrls: string[] = [];
    const questions = await detectSheetQuestions({
      location: {
        hash: '#gid=789',
        pathname: '/spreadsheets/d/sheet_csv/edit',
      },
      fetcher: async (url) => {
        requestedUrls.push(url);
        if (url.includes('tqx=out:json')) {
          return { ok: true, text: async () => '{"status":"error"}' };
        }
        return {
          ok: true,
          text: async () => 'Question,Answer\nDo you monitor audit logs?,',
        };
      },
    });

    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]).toContain('tqx=out:csv');
    expect(questions[0]?.tag).toBe('sheets:A2->B2');
  });

  it('falls back to json when csv endpoints have no detectable questions', async () => {
    const requestedUrls: string[] = [];
    const questions = await detectSheetQuestions({
      location: {
        hash: '#gid=777',
        pathname: '/spreadsheets/d/sheet_noisy/edit',
      },
      fetcher: async (url) => {
        requestedUrls.push(url);
        if (url.includes('tqx=out:json')) {
          return {
            ok: true,
            text: async () => `google.visualization.Query.setResponse(${JSON.stringify({
              table: {
                cols: [{ label: 'Question' }, { label: 'Answer' }],
                rows: [{ c: [{ v: 'Do you encrypt databases?' }, null] }],
              },
            })});`,
          };
        }
        return {
          ok: true,
          text: async () => 'A\nx',
        };
      },
    });

    expect(requestedUrls).toHaveLength(3);
    expect(questions[0]?.tag).toBe('sheets:A2->B2');
  });

  it('treats first row as headers when gviz column labels are A/B/C', () => {
    const questions = tableToQuestions({
      gid: '9',
      table: {
        cols: [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
        rows: [
          { c: [{ v: '#' }, { v: 'Question' }, { v: 'Answer' }] },
          { c: [{ v: 1 }, { v: 'Do you test backups?' }, null] },
        ],
      },
    });

    expect(questions[0]?.id).toBe('sheet:9:2:3');
    expect(questions[0]?.tag).toBe('sheets:B2->C2');
  });

});
