import { columnIndexToName } from '../sheet-columns';
import { parseCsvRows } from './csv';

export interface GvizCell {
  v?: unknown;
  f?: unknown;
}

export interface GvizColumn {
  label?: unknown;
}

export interface GvizRow {
  c?: unknown;
}

export interface GvizTable {
  cols?: unknown;
  rows?: unknown;
}

export function parseGvizTable(text: string): GvizTable | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  const parsed: unknown = JSON.parse(text.slice(start, end + 1));
  if (!isRecord(parsed) || !isRecord(parsed.table)) return null;
  return parsed.table;
}

export function csvToTable(text: string): GvizTable | null {
  if (/^\s*</.test(text) || /<!doctype html/i.test(text)) return null;
  const rows = parseCsvRows(text, { keepEmptyRows: true });
  if (rows.length === 0) return null;
  const table = matrixToTable(rows);
  return readColumns(table.cols).length >= 2 ? table : null;
}

export function matrixToTable(rows: string[][]): GvizTable {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  return {
    cols: Array.from({ length: width }, (_value, index) => ({
      label: columnIndexToName(index),
    })),
    rows: rows.map((row) => ({
      c: Array.from({ length: width }, (_value, index) => ({
        v: row[index] ?? '',
      })),
    })),
  };
}

export function readColumns(value: unknown): GvizColumn[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

export function readRows(value: unknown): GvizRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

export function readCells(value: unknown): GvizCell[] {
  if (!Array.isArray(value)) return [];
  return value.map((cell) => (isRecord(cell) ? cell : {}));
}

export function cellText(cell: GvizCell | undefined): string {
  const value = cell?.f ?? cell?.v;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
