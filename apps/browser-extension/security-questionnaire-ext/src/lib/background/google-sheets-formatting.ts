const MIN_ANSWER_COLUMN_WIDTH_PX = 360;
const MAX_ANSWER_COLUMN_WIDTH_PX = 720;
const COLUMN_PADDING_PX = 48;
const PX_PER_CHARACTER = 7;

interface SheetApiTarget {
  fieldId: string;
  answer: string;
  gid: string;
  row: number;
  col: number;
}

interface DimensionRange {
  sheetId: number;
  dimension: 'COLUMNS' | 'ROWS';
  startIndex: number;
  endIndex: number;
}

interface GridRange {
  sheetId: number;
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
}

export type SheetBatchUpdateRequest = {
  autoResizeDimensions?: { dimensions: DimensionRange };
  repeatCell?: {
    range: GridRange;
    cell: {
      userEnteredFormat: {
        verticalAlignment: 'TOP';
        wrapStrategy: 'WRAP';
      };
    };
    fields: string;
  };
  updateDimensionProperties?: {
    range: DimensionRange;
    properties: { pixelSize: number };
    fields: 'pixelSize';
  };
};

export function buildSheetFormattingRequests(params: {
  gid: string;
  targets: SheetApiTarget[];
}): SheetBatchUpdateRequest[] {
  const sheetId = Number(params.gid);
  if (!Number.isSafeInteger(sheetId)) return [];

  return [
    ...buildColumnWidthRequests({ sheetId, targets: params.targets }),
    ...buildCellWrapRequests({ sheetId, targets: params.targets }),
    ...buildRowAutoResizeRequests({ sheetId, targets: params.targets }),
  ];
}

function buildColumnWidthRequests(params: {
  sheetId: number;
  targets: SheetApiTarget[];
}): SheetBatchUpdateRequest[] {
  return Array.from(groupTargetsByColumn(params.targets)).map(([col, targets]) => ({
    updateDimensionProperties: {
      range: {
        sheetId: params.sheetId,
        dimension: 'COLUMNS',
        startIndex: col - 1,
        endIndex: col,
      },
      properties: { pixelSize: calculateAnswerColumnWidth(targets) },
      fields: 'pixelSize',
    },
  }));
}

function buildCellWrapRequests(params: {
  sheetId: number;
  targets: SheetApiTarget[];
}): SheetBatchUpdateRequest[] {
  return Array.from(groupTargetsByColumn(params.targets)).flatMap(([col, targets]) =>
    compactIndexes(targets.map((target) => target.row - 1)).map((span) => ({
      repeatCell: {
        range: {
          sheetId: params.sheetId,
          startRowIndex: span.start,
          endRowIndex: span.end,
          startColumnIndex: col - 1,
          endColumnIndex: col,
        },
        cell: {
          userEnteredFormat: {
            verticalAlignment: 'TOP',
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy',
      },
    })),
  );
}

function buildRowAutoResizeRequests(params: {
  sheetId: number;
  targets: SheetApiTarget[];
}): SheetBatchUpdateRequest[] {
  return compactIndexes(params.targets.map((target) => target.row - 1)).map((span) => ({
    autoResizeDimensions: {
      dimensions: {
        sheetId: params.sheetId,
        dimension: 'ROWS',
        startIndex: span.start,
        endIndex: span.end,
      },
    },
  }));
}

function groupTargetsByColumn(targets: SheetApiTarget[]): Map<number, SheetApiTarget[]> {
  const groups = new Map<number, SheetApiTarget[]>();
  for (const target of targets) {
    groups.set(target.col, [...(groups.get(target.col) ?? []), target]);
  }
  return groups;
}

function calculateAnswerColumnWidth(targets: SheetApiTarget[]): number {
  const longestLine = Math.max(
    0,
    ...targets.flatMap((target) =>
      target.answer.split(/\r?\n/).map((line) => line.trim().length),
    ),
  );
  const width = Math.ceil(longestLine * PX_PER_CHARACTER + COLUMN_PADDING_PX);
  return Math.min(
    MAX_ANSWER_COLUMN_WIDTH_PX,
    Math.max(MIN_ANSWER_COLUMN_WIDTH_PX, width),
  );
}

function compactIndexes(indexes: number[]): { start: number; end: number }[] {
  const sorted = Array.from(new Set(indexes)).sort((first, second) => first - second);
  const spans: { start: number; end: number }[] = [];
  for (const index of sorted) {
    const previous = spans.at(-1);
    if (previous && previous.end === index) {
      previous.end = index + 1;
      continue;
    }
    spans.push({ start: index, end: index + 1 });
  }
  return spans;
}
