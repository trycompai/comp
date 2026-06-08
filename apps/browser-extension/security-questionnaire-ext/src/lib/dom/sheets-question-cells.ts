import {
  columnIndexToName,
  columnNameToIndex,
} from '../sheet-columns';
import type { DetectedQuestion, SheetMapping } from '../types';
import {
  cellText,
  matrixToTable,
  readCells,
  readColumns,
  readRows,
  type GvizRow,
  type GvizTable,
} from './sheets-table';

type SheetMappingConfig = Pick<
  SheetMapping,
  'questionColumn' | 'answerColumn' | 'startRow' | 'endRow'
>;

export function tableToQuestions(params: {
  table: GvizTable;
  gid: string;
  mapping?: SheetMappingConfig | null;
}): DetectedQuestion[] {
  if (params.mapping) {
    return tableToMappedQuestions({
      table: params.table,
      gid: params.gid,
      mapping: params.mapping,
    });
  }

  const rows = readRows(params.table.rows);
  const labels = readColumns(params.table.cols).map((column) =>
    cellText({ v: column.label }),
  );
  const labelHeader = labels.filter(Boolean);
  const firstRowHeader = readCells(rows[0]?.c).map(cellText);
  const labelsAreHeaders = hasQuestionnaireHeaders(labelHeader);
  const firstRowIsHeader = hasQuestionnaireHeaders(firstRowHeader);
  const header = labelsAreHeaders ? labels : firstRowHeader;
  const questionColumn = findQuestionColumn({ header, rows });
  if (questionColumn === null) return [];

  const answerColumn = findAnswerColumn({ header, questionColumn });
  const hasHeaderRow = !labelsAreHeaders && firstRowIsHeader;
  const dataRows = hasHeaderRow ? rows.slice(1) : rows;
  const firstDataRowNumber = labelsAreHeaders || hasHeaderRow ? 2 : 1;

  return dataRows.flatMap((row, index) => {
    const cells = readCells(row.c);
    const question = normalizeQuestionCell({
      value: cellText(cells[questionColumn]),
      permissive: Boolean(labelsAreHeaders || firstRowIsHeader),
    });
    if (!question) return [];

    return [buildQuestion({
      answer: cellText(cells[answerColumn]),
      answerColumn,
      gid: params.gid,
      question,
      questionColumn,
      rowNumber: firstDataRowNumber + index,
    })];
  }).slice(0, 100);
}

export function matrixToQuestions(params: {
  rows: string[][];
  gid: string;
}): DetectedQuestion[] {
  return tableToQuestions({
    gid: params.gid,
    table: matrixToTable(params.rows),
  });
}

function tableToMappedQuestions(params: {
  table: GvizTable;
  gid: string;
  mapping: SheetMappingConfig;
}): DetectedQuestion[] {
  const questionColumn = columnNameToIndex(params.mapping.questionColumn);
  const answerColumn = columnNameToIndex(params.mapping.answerColumn);
  if (questionColumn === null || answerColumn === null) return [];

  const rows = readRows(params.table.rows);
  const endRow = Math.min(params.mapping.endRow ?? rows.length, rows.length);
  const boundedQuestions = buildMappedQuestions({
    rows,
    gid: params.gid,
    questionColumn,
    answerColumn,
    startRow: params.mapping.startRow,
    endRow,
  });
  if (params.mapping.endRow !== null) return boundedQuestions;

  const columnQuestions = buildMappedQuestions({
    rows,
    gid: params.gid,
    questionColumn,
    answerColumn,
    startRow: 1,
    endRow,
  });

  return shouldUseColumnQuestions({
    boundedQuestions,
    columnQuestions,
  }) ? columnQuestions : boundedQuestions;
}

function buildMappedQuestions(params: {
  rows: GvizRow[];
  gid: string;
  questionColumn: number;
  answerColumn: number;
  startRow: number;
  endRow: number;
}): DetectedQuestion[] {
  return params.rows.flatMap((row, index) => {
    const rowNumber = index + 1;
    if (rowNumber < params.startRow || rowNumber > params.endRow) return [];

    const cells = readCells(row.c);
    const question = normalizeQuestionCell({
      value: cellText(cells[params.questionColumn]),
      permissive: true,
    });
    if (!question) return [];

    return [buildQuestion({
      answer: cellText(cells[params.answerColumn]),
      answerColumn: params.answerColumn,
      gid: params.gid,
      question,
      questionColumn: params.questionColumn,
      rowNumber,
    })];
  }).slice(0, 100);
}

function shouldUseColumnQuestions(params: {
  boundedQuestions: DetectedQuestion[];
  columnQuestions: DetectedQuestion[];
}): boolean {
  if (params.columnQuestions.length <= params.boundedQuestions.length) return false;
  if (params.boundedQuestions.length === 0) return params.columnQuestions.length > 0;

  const boundedFirstRow = getQuestionRow(params.boundedQuestions[0]);
  if (boundedFirstRow === null) return false;

  const columnRows = params.columnQuestions.flatMap((question) => {
    const row = getQuestionRow(question);
    return row === null ? [] : [row];
  });
  if (columnRows.length === 0) return false;

  const firstColumnRow = Math.min(...columnRows);
  const rowSet = new Set(columnRows);
  for (let row = firstColumnRow; row < boundedFirstRow; row += 1) {
    if (!rowSet.has(row)) return false;
  }
  return firstColumnRow < boundedFirstRow;
}

function findQuestionColumn(params: {
  header: string[];
  rows: GvizRow[];
}): number | null {
  const headerIndex = params.header.findIndex(isQuestionHeader);
  if (headerIndex >= 0) return headerIndex;

  let bestIndex = -1;
  let bestScore = 0;
  for (let index = 0; index < 12; index += 1) {
    const score = params.rows.reduce((total, row) => {
      const text = normalizeQuestionCell({
        value: cellText(readCells(row.c)[index]),
        permissive: false,
      });
      return total + scoreQuestionCell(text);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return bestIndex >= 0 && bestScore > 80 ? bestIndex : null;
}

function findAnswerColumn(params: {
  header: string[];
  questionColumn: number;
}): number {
  const answerIndex = params.header.findIndex((value) =>
    /answer|response|reply|vendor response/i.test(value),
  );
  return answerIndex >= 0 ? answerIndex : params.questionColumn + 1;
}

function normalizeQuestionCell(params: {
  value: string;
  permissive: boolean;
}): string {
  const text = params.value.replace(/\s+/g, ' ').trim();
  const minLength = params.permissive ? 3 : 8;
  if (text.length < minLength || isQuestionHeader(text) || isMetadataValue(text)) return '';
  return text.slice(0, 700);
}

function scoreQuestionCell(text: string): number {
  if (!text) return 0;
  const semanticBoost = /[?]/.test(text) ||
    /^\s*(?:\d+(?:\.\d+)*|[A-Z]{1,6}[- ]?\d+(?:\.\d+)*)\b/.test(text) ||
    /^\s*(?:do|does|did|is|are|has|have|can|will|should|must)\b/i.test(text)
    ? 80
    : 0;
  return Math.min(text.length, 160) + semanticBoost;
}

function isQuestionHeader(value: string | undefined): boolean {
  const text = value?.trim() ?? '';
  return Boolean(
    text.length > 0 &&
      text.length <= 48 &&
      /question|requirement|control|prompt|description/i.test(text),
  );
}

function hasQuestionnaireHeaders(values: string[]): boolean {
  return values.some(isQuestionHeader) || values.some((value) =>
    /answer|response|reply|vendor response/i.test(value),
  );
}

function isMetadataValue(value: string): boolean {
  return Boolean(
    /^[#\d.,:/\-\s]+$/.test(value) ||
      /^(?:yes|no|n\/a|na|none|owner|status|notes?)$/i.test(value),
  );
}

function buildQuestion(params: {
  answer: string;
  answerColumn: number;
  gid: string;
  question: string;
  questionColumn: number;
  rowNumber: number;
}): DetectedQuestion {
  return {
    id: getSheetFieldId({
      gid: params.gid,
      rowNumber: params.rowNumber,
      answerColumn: params.answerColumn,
    }),
    question: params.question,
    value: params.answer,
    isEmpty: params.answer.trim().length === 0,
    tag: [
      'sheets:',
      columnIndexToName(params.questionColumn),
      params.rowNumber,
      '->',
      columnIndexToName(params.answerColumn),
      params.rowNumber,
    ].join(''),
  };
}

function getQuestionRow(question: DetectedQuestion | undefined): number | null {
  const match = question?.tag.match(/^sheets:[A-Z]+(\d+)->[A-Z]+(\d+)$/);
  if (!match || match[1] !== match[2]) return null;
  return Number(match[1]);
}

function getSheetFieldId(params: {
  gid: string;
  rowNumber: number;
  answerColumn: number;
}): string {
  return `sheet:${params.gid}:${params.rowNumber}:${params.answerColumn + 1}`;
}
