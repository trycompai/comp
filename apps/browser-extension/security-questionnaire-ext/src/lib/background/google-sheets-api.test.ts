import { describe, expect, it } from 'vitest';
import {
  buildSheetValueUpdates,
  quoteSheetTitle,
} from './google-sheets-api';
import { buildSheetFormattingRequests } from './google-sheets-formatting';

describe('Google Sheets API value updates', () => {
  it('builds exact single-cell ranges for each answer', () => {
    const updates = buildSheetValueUpdates({
      sheetTitle: 'Vendor QA',
      targets: [
        {
          fieldId: 'sheet:123:2:3',
          gid: '123',
          row: 2,
          col: 3,
          answer: 'First answer',
        },
        {
          fieldId: 'sheet:123:4:3',
          gid: '123',
          row: 4,
          col: 3,
          answer: 'Third answer',
        },
      ],
    });

    expect(updates).toEqual([
      {
        fieldId: 'sheet:123:2:3',
        range: "'Vendor QA'!C2",
        values: [['First answer']],
      },
      {
        fieldId: 'sheet:123:4:3',
        range: "'Vendor QA'!C4",
        values: [['Third answer']],
      },
    ]);
  });

  it('quotes sheet titles for A1 notation', () => {
    expect(quoteSheetTitle("Vendor's QA")).toBe("'Vendor''s QA'");
  });
});

describe('Google Sheets API formatting requests', () => {
  it('widens answer columns, wraps cells, and auto-resizes touched rows', () => {
    const requests = buildSheetFormattingRequests({
      gid: '456',
      targets: [
        {
          fieldId: 'sheet:456:2:3',
          gid: '456',
          row: 2,
          col: 3,
          answer: `${'x'.repeat(120)}\nshort line`,
        },
        {
          fieldId: 'sheet:456:3:3',
          gid: '456',
          row: 3,
          col: 3,
          answer: 'Second answer',
        },
      ],
    });

    expect(requests).toEqual([
      {
        updateDimensionProperties: {
          range: {
            sheetId: 456,
            dimension: 'COLUMNS',
            startIndex: 2,
            endIndex: 3,
          },
          properties: { pixelSize: 720 },
          fields: 'pixelSize',
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: 456,
            startRowIndex: 1,
            endRowIndex: 3,
            startColumnIndex: 2,
            endColumnIndex: 3,
          },
          cell: {
            userEnteredFormat: {
              verticalAlignment: 'TOP',
              wrapStrategy: 'WRAP',
            },
          },
          fields: 'userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy',
        },
      },
      {
        autoResizeDimensions: {
          dimensions: {
            sheetId: 456,
            dimension: 'ROWS',
            startIndex: 1,
            endIndex: 3,
          },
        },
      },
    ]);
  });
});
