import { describe, expect, it } from 'vitest';
import { parseCsvRows } from './csv';

describe('CSV parsing', () => {
  it('parses quoted commas and multiline cells', () => {
    const rows = parseCsvRows([
      'Question,Answer',
      '"Do you encrypt data, including backups?","Yes"',
      '"Do you review',
      'access quarterly?",',
    ].join('\n'));

    expect(rows).toEqual([
      ['Question', 'Answer'],
      ['Do you encrypt data, including backups?', 'Yes'],
      ['Do you review\naccess quarterly?', ''],
    ]);
  });

  it('can preserve empty rows for physical spreadsheet row numbers', () => {
    expect(parseCsvRows('Question,Answer\n,\nDo you encrypt data?,', {
      keepEmptyRows: true,
    })).toEqual([
      ['Question', 'Answer'],
      ['', ''],
      ['Do you encrypt data?', ''],
    ]);
  });
});
