interface OutputOptions {
  json: boolean;
}

export function outputResult<T>(data: T, opts: OutputOptions): void {
  if (opts.json) {
    console.log(JSON.stringify({ success: true, data }, null, 2));
    return;
  }
  if (data === undefined || data === null) {
    console.log('Done.');
    return;
  }
  if (Array.isArray(data)) {
    outputTable(data);
    return;
  }
  if (typeof data === 'object') {
    outputRecord(data as Record<string, unknown>);
    return;
  }
  console.log(String(data));
}

export function outputSuccess(message: string, opts: OutputOptions): void {
  if (opts.json) {
    console.log(JSON.stringify({ success: true, message }));
  } else {
    console.log(message);
  }
}

function outputRecord(record: Record<string, unknown>): void {
  const maxKeyLen = Math.max(...Object.keys(record).map((k) => k.length));
  for (const [key, value] of Object.entries(record)) {
    const displayValue = formatValue(value);
    console.log(`  ${key.padEnd(maxKeyLen)}  ${displayValue}`);
  }
}

function outputTable(rows: unknown[]): void {
  if (rows.length === 0) {
    console.log('No results found.');
    return;
  }

  const first = rows[0] as Record<string, unknown>;
  const keys = Object.keys(first).filter((k) => !isComplexField(first[k]));

  const widths: Record<string, number> = {};
  for (const key of keys) {
    widths[key] = key.length;
  }
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    for (const key of keys) {
      const val = truncate(formatValue(r[key]), 50);
      widths[key] = Math.max(widths[key] ?? 0, val.length);
    }
  }

  const header = keys.map((k) => k.padEnd(widths[k] ?? 0)).join('  ');
  const separator = keys.map((k) => '-'.repeat(widths[k] ?? 0)).join('  ');

  console.log(header);
  console.log(separator);

  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const line = keys.map((k) => truncate(formatValue(r[k]), 50).padEnd(widths[k] ?? 0)).join('  ');
    console.log(line);
  }

  console.log(`\n${rows.length} result(s)`);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) return value.length > 0 ? value.map(formatArrayItem).join(', ') : '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatArrayItem(item: unknown): string {
  if (typeof item === 'object' && item !== null && 'name' in item) {
    return String((item as { name: string }).name);
  }
  return String(item);
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function isComplexField(value: unknown): boolean {
  if (Array.isArray(value)) return true;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return true;
  return false;
}
