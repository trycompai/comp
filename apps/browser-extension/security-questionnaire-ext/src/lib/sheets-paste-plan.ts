interface SheetAnswer {
  fieldId: string;
  answer: string;
}

interface SheetTarget extends SheetAnswer {
  gid: string;
  row: number;
  col: number;
}

export interface SheetPastePlan {
  gid: string;
  range: string;
  tsv: string;
  targetIds: string[];
  failedIds: string[];
}

export interface SheetPastePayload extends SheetPastePlan {
  itemIds: string[];
}

export function buildSheetPastePlan(
  answers: SheetAnswer[],
): SheetPastePlan | null {
  const targets = answers.flatMap(parseSheetTarget);
  if (targets.length === 0) return null;

  const gid = targets[0].gid;
  const eligible = targets.filter((target) => target.gid === gid);
  const failedIds = answers
    .filter((answer) => !eligible.some((target) => target.fieldId === answer.fieldId))
    .map((answer) => answer.fieldId);
  const rows = eligible.map((target) => target.row);
  const cols = eligible.map((target) => target.col);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  const byCell = new Map(eligible.map((target) => [`${target.row}:${target.col}`, target.answer]));
  const matrix: string[][] = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    const values: string[] = [];
    for (let col = minCol; col <= maxCol; col += 1) {
      values.push(escapeTsvCell(byCell.get(`${row}:${col}`) ?? ''));
    }
    matrix.push(values);
  }

  return {
    gid,
    range: getRange({ minRow, maxRow, minCol, maxCol }),
    tsv: matrix.map((row) => row.join('\t')).join('\n'),
    targetIds: eligible.map((target) => target.fieldId),
    failedIds,
  };
}

function parseSheetTarget(answer: SheetAnswer): SheetTarget[] {
  const match = answer.fieldId.match(/^sheet:([^:]+):(\d+):(\d+)$/);
  if (!match) return [];
  return [{
    ...answer,
    gid: match[1],
    row: Number(match[2]),
    col: Number(match[3]),
  }];
}

function getRange(params: {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}): string {
  const start = `${columnName(params.minCol)}${params.minRow}`;
  const end = `${columnName(params.maxCol)}${params.maxRow}`;
  return start === end ? start : `${start}:${end}`;
}

function columnName(column: number): string {
  let value = column;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function escapeTsvCell(value: string): string {
  return value.replace(/\r?\n/g, ' ').replace(/\t/g, ' ').trim();
}
