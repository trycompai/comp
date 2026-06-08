import type { DetectedQuestion } from '../types';
import { matrixToQuestions } from './sheets-detection';

interface SheetDomLocation {
  hash: string;
}

interface SheetCell {
  row: number;
  col: number;
  text: string;
}

const CELL_SELECTOR = [
  '[role="gridcell"][aria-rowindex][aria-colindex]',
  '[data-row][data-col]',
  '[data-row-index][data-column-index]',
].join(',');

export function detectVisibleSheetQuestions(params: {
  root: ParentNode;
  location: SheetDomLocation;
}): DetectedQuestion[] {
  const cells = collectCells(params.root);
  if (cells.length === 0) return [];

  const maxRow = Math.max(...cells.map((cell) => cell.row));
  const maxCol = Math.max(...cells.map((cell) => cell.col));
  const rows = Array.from({ length: maxRow }, () =>
    Array.from({ length: maxCol }, () => ''),
  );

  for (const cell of cells) {
    rows[cell.row - 1][cell.col - 1] = cell.text;
  }

  return matrixToQuestions({ rows, gid: parseGid(params.location.hash) });
}

function collectCells(root: ParentNode): SheetCell[] {
  return Array.from(root.querySelectorAll(CELL_SELECTOR)).flatMap((element) => {
    if (!(element instanceof HTMLElement)) return [];
    const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text) return [];

    const row = readIndex({
      element,
      oneBasedAttrs: ['aria-rowindex'],
      zeroBasedAttrs: ['data-row', 'data-row-index'],
    });
    const col = readIndex({
      element,
      oneBasedAttrs: ['aria-colindex'],
      zeroBasedAttrs: ['data-col', 'data-column-index'],
    });
    return row && col ? [{ row, col, text }] : [];
  });
}

function readIndex(params: {
  element: HTMLElement;
  oneBasedAttrs: string[];
  zeroBasedAttrs: string[];
}): number | null {
  for (const attr of params.oneBasedAttrs) {
    const value = parsePositiveInteger(params.element.getAttribute(attr));
    if (value !== null) return value;
  }
  for (const attr of params.zeroBasedAttrs) {
    const value = parsePositiveInteger(params.element.getAttribute(attr));
    if (value !== null) return value + 1;
  }
  return null;
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return number >= 0 ? number : null;
}

function parseGid(hash: string): string {
  const match = hash.match(/(?:^|[&#])gid=([^&]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : '0';
}
