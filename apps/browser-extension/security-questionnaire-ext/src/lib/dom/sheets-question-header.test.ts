import { describe, expect, it } from 'vitest';
import { tableToQuestions } from './sheets-detection';
import type { GvizRow } from './sheets-table';

function row(values: string[]): GvizRow {
  return { c: values.map((value) => ({ v: value })) };
}

function questionsFor(cells: string[]): string[] {
  const result = tableToQuestions({
    gid: '0',
    mapping: null,
    table: {
      cols: [{ label: '#' }, { label: 'Question' }, { label: 'Answer' }],
      rows: [
        row(['#', 'Question', 'Answer']),
        ...cells.map((cell, index) => row([String(index + 1), cell, ''])),
      ],
    },
  });
  return result.map((entry) => entry.question);
}

describe('question cells that look like header labels', () => {
  it('keeps short questions containing header vocabulary', () => {
    const questions = questionsFor([
      'Are security controls documented?',
      'Is there a control owner?',
      'Do you meet this requirement?',
    ]);

    expect(questions).toEqual([
      'Are security controls documented?',
      'Is there a control owner?',
      'Do you meet this requirement?',
    ]);
  });

  it('still drops a repeated short column label', () => {
    const questions = questionsFor([
      'Encryption at rest is enforced everywhere',
      'Control description',
      'Quarterly access reviews are performed',
    ]);

    expect(questions).not.toContain('Control description');
    expect(questions).toHaveLength(2);
  });
});
