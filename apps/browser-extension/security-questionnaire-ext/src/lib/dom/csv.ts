export function parseCsvRows(
  text: string,
  options: { keepEmptyRows?: boolean } = {},
): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let index = 0;
  let quoted = false;

  while (index < text.length) {
    const char = text[index] ?? '';
    const next = text[index + 1] ?? '';

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 2;
        continue;
      }
      if (char === '"') {
        quoted = false;
        index += 1;
        continue;
      }
      cell += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = true;
      index += 1;
      continue;
    }
    if (char === ',') {
      row.push(cell.trim());
      cell = '';
      index += 1;
      continue;
    }
    if (char === '\n' || char === '\r') {
      row.push(cell.trim());
      if (options.keepEmptyRows || row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = '';
      index += char === '\r' && next === '\n' ? 2 : 1;
      continue;
    }
    cell += char;
    index += 1;
  }

  row.push(cell.trim());
  if (options.keepEmptyRows || row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}
