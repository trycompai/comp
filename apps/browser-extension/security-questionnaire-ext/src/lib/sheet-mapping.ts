import { normalizeColumnName } from './sheet-columns';
import type { DetectedQuestion, SheetMapping } from './types';

export interface SheetIdentity {
  spreadsheetId: string;
  gid: string;
}

export interface SheetMappingDraft {
  questionColumn: string;
  answerColumn: string;
  startRow: number;
  endRow: number | null;
}

export function parseSheetIdentity(params: {
  pathname: string;
  hash: string;
}): SheetIdentity | null {
  const spreadsheetId = parseSpreadsheetId(params.pathname);
  if (!spreadsheetId) return null;
  return { spreadsheetId, gid: parseGid(params.hash) };
}

export function parseSheetIdentityFromUrl(url: string): SheetIdentity | null {
  try {
    const parsed = new URL(url);
    return parseSheetIdentity({
      pathname: parsed.pathname,
      hash: parsed.hash,
    });
  } catch {
    return null;
  }
}

export function createDefaultSheetMapping(
  identity: SheetIdentity,
): SheetMapping {
  return {
    spreadsheetId: identity.spreadsheetId,
    gid: identity.gid,
    questionColumn: 'B',
    answerColumn: 'C',
    startRow: 2,
    endRow: null,
    source: 'manual',
    confirmed: false,
    updatedAt: Date.now(),
  };
}

export function createManualSheetMapping(params: {
  identity: SheetIdentity;
  draft: SheetMappingDraft;
}): SheetMapping {
  return {
    spreadsheetId: params.identity.spreadsheetId,
    gid: params.identity.gid,
    questionColumn: params.draft.questionColumn,
    answerColumn: params.draft.answerColumn,
    startRow: params.draft.startRow,
    endRow: params.draft.endRow,
    source: 'manual',
    confirmed: true,
    updatedAt: Date.now(),
  };
}

export function inferSheetMappingFromQuestions(params: {
  identity: SheetIdentity;
  questions: DetectedQuestion[];
}): SheetMapping | null {
  const targets = params.questions.flatMap(parseQuestionTag);
  if (targets.length === 0) return null;

  const first = targets[0];
  const startRow = Math.min(...targets.map((target) => target.row));
  const endRow = Math.max(...targets.map((target) => target.row));
  return {
    spreadsheetId: params.identity.spreadsheetId,
    gid: params.identity.gid,
    questionColumn: first.questionColumn,
    answerColumn: first.answerColumn,
    startRow,
    endRow,
    source: 'auto',
    confirmed: false,
    updatedAt: Date.now(),
  };
}

export function alignSheetMappingToQuestions(params: {
  mapping: SheetMapping;
  questions: DetectedQuestion[];
}): SheetMapping {
  const targets = params.questions.flatMap(parseQuestionTag);
  if (targets.length === 0) return params.mapping;

  return {
    ...params.mapping,
    startRow: Math.min(...targets.map((target) => target.row)),
    endRow: params.mapping.endRow === null
      ? null
      : Math.max(...targets.map((target) => target.row)),
    updatedAt: Date.now(),
  };
}

export function parseSheetMapping(value: unknown): SheetMapping | null {
  if (!isRecord(value)) return null;
  const questionColumn = readColumn(value.questionColumn);
  const answerColumn = readColumn(value.answerColumn);
  if (!questionColumn || !answerColumn) return null;
  if (
    typeof value.spreadsheetId !== 'string' ||
    typeof value.gid !== 'string' ||
    typeof value.startRow !== 'number' ||
    !Number.isInteger(value.startRow) ||
    value.startRow < 1 ||
    !isEndRow(value.endRow, value.startRow) ||
    !isSource(value.source) ||
    typeof value.confirmed !== 'boolean' ||
    typeof value.updatedAt !== 'number'
  ) {
    return null;
  }

  return {
    spreadsheetId: value.spreadsheetId,
    gid: value.gid,
    questionColumn,
    answerColumn,
    startRow: value.startRow,
    endRow: value.endRow,
    source: value.source,
    confirmed: value.confirmed,
    updatedAt: value.updatedAt,
  };
}

export function describeSheetMapping(mapping: SheetMapping): string {
  const rows = mapping.endRow
    ? `${mapping.startRow}-${mapping.endRow}`
    : `${mapping.startRow}+`;
  return `questions ${mapping.questionColumn}, answers ${mapping.answerColumn}, rows ${rows}`;
}

function parseQuestionTag(question: DetectedQuestion): {
  questionColumn: string;
  answerColumn: string;
  row: number;
}[] {
  const match = question.tag.match(/^sheets:([A-Z]+)(\d+)->([A-Z]+)(\d+)$/);
  if (!match || match[2] !== match[4]) return [];
  const questionColumn = normalizeColumnName(match[1] ?? '');
  const answerColumn = normalizeColumnName(match[3] ?? '');
  if (!questionColumn || !answerColumn) return [];
  return [{
    questionColumn,
    answerColumn,
    row: Number(match[2]),
  }];
}

function parseSpreadsheetId(pathname: string): string | null {
  const match = pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  return match?.[1] ?? null;
}

function parseGid(hash: string): string {
  const match = hash.match(/(?:^|[&#])gid=([^&]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : '0';
}

function readColumn(value: unknown): string | null {
  return typeof value === 'string' ? normalizeColumnName(value) : null;
}

function isEndRow(value: unknown, startRow: number): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= startRow)
  );
}

function isSource(value: unknown): value is SheetMapping['source'] {
  return value === 'auto' || value === 'manual';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
