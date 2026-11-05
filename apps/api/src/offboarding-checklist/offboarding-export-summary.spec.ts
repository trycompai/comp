// The export service imports `db` from `@db` at module load; stub it so this
// pure-function test doesn't spin up a real Prisma client.
jest.mock('@db', () => ({
  db: {},
  AttachmentEntityType: { offboarding_checklist: 'offboarding_checklist' },
}));

import { buildSummaryCsv } from './offboarding-export.service';

type Items = Parameters<typeof buildSummaryCsv>[0];

describe('buildSummaryCsv', () => {
  it('flags excepted items with an Exception status and includes the reason', () => {
    const csv = buildSummaryCsv([
      {
        title: 'Retrieve company devices',
        completed: true,
        isException: true,
        exceptionReason: 'No company device was ever issued',
        completion: null,
        evidence: [],
      },
    ] as unknown as Items);

    const [header, row] = csv.split('\n');
    expect(header).toContain('Exception Reason');
    expect(row).toContain('Exception');
    expect(row).toContain('No company device was ever issued');
  });

  it('uses Complete / Pending and a blank reason for non-exception items', () => {
    const csv = buildSummaryCsv([
      {
        title: 'Done thing',
        completed: true,
        isException: false,
        exceptionReason: null,
        completion: null,
        evidence: [],
      },
      {
        title: 'Pending thing',
        completed: false,
        isException: false,
        exceptionReason: null,
        completion: null,
        evidence: [],
      },
    ] as unknown as Items);

    const lines = csv.split('\n');
    expect(lines[1]).toContain('"Done thing",Complete');
    expect(lines[2]).toContain('"Pending thing",Pending');
    // A completed/pending row ends with an empty reason field.
    expect(lines[1].endsWith('""')).toBe(true);
  });
});
