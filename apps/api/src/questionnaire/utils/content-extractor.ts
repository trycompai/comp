import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import ExcelJS from 'exceljs';
import AdmZip from 'adm-zip';
import mammoth from 'mammoth';
import { PDFDocument } from 'pdf-lib';
import {
  assertXlsxDecompressionWithinLimit,
  loadXlsxWorkbook,
} from '@/utils/load-xlsx';
import { PARSING_MODEL, VISION_EXTRACTION_PROMPT } from './constants';
import { parseQuestionsAndAnswers } from './question-parser';

export interface ContentExtractionLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

// Default no-op logger for when no logger is provided
const defaultLogger: ContentExtractionLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

interface ExtractedExcelCell {
  address: string;
  columnIndex: number;
  value: string;
  isFormula: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeCellText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () =>
      runWorker(),
    ),
  );

  return results;
}

function extractExcelCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!isRecord(value)) {
    return '';
  }

  if (Array.isArray(value.richText)) {
    return value.richText
      .map((part) =>
        isRecord(part) && typeof part.text === 'string' ? part.text : '',
      )
      .join('');
  }

  if (value.result !== undefined) {
    return extractExcelCellValue(value.result);
  }

  if (typeof value.text === 'string') {
    return value.text;
  }

  return '';
}

function getExcelCellText(cell: ExcelJS.Cell): string {
  const extracted = normalizeCellText(extractExcelCellValue(cell.value));
  if (extracted) {
    return extracted;
  }

  try {
    return normalizeCellText(cell.text);
  } catch {
    return '';
  }
}

function hasFormulaValue(value: unknown): boolean {
  return isRecord(value) && typeof value.formula === 'string';
}

function columnNameFromIndex(index: number): string {
  let current = index;
  let name = '';

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
}

function normalizeForClassification(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isPlaceholderCell(value: string): boolean {
  const normalized = normalizeForClassification(value);
  return /^(?:\d+#\s*-\s*)?a\s+(?:remplir|completer)$/.test(normalized);
}

function isScoringOptionsCell(value: string): boolean {
  const normalized = normalizeForClassification(value);
  return /^\((?:oui|yes|non|no|n\/a|na)\s*:\s*-?\d+(?:\s*,\s*(?:oui|yes|non|no|n\/a|na)\s*:\s*-?\d+)*\)$/.test(
    normalized,
  );
}

function headerLooksLike(header: string, keywords: string[]): boolean {
  const normalized = normalizeForClassification(header);
  return keywords.some((keyword) => normalized.includes(keyword));
}

function inferCellLabel(cell: ExtractedExcelCell, header?: string): string {
  if (
    header &&
    headerLooksLike(header, ['question', 'prompt', 'requirement'])
  ) {
    return 'Question';
  }

  if (header && headerLooksLike(header, ['response', 'answer', 'reply'])) {
    return 'Response';
  }

  if (header && headerLooksLike(header, ['comment', 'explanation'])) {
    return 'Comment';
  }

  if (header && headerLooksLike(header, ['mode operatoire', 'guidance'])) {
    return 'Guidance';
  }

  if (/[?？]/.test(cell.value)) {
    return 'Question';
  }

  if (normalizeForClassification(cell.value).startsWith('exemple')) {
    return 'Example';
  }

  return 'Cell';
}

function findHeaderRow(rows: ExtractedExcelCell[][]): {
  rowIndex: number;
  headersByColumn: Map<number, string>;
} {
  const headerKeywords = [
    'question',
    'response',
    'answer',
    'comment',
    'commentaires',
    'attachment',
    'reply',
    'mode operatoire',
    'reponse',
  ];

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    const matchCount = headerKeywords.filter((keyword) =>
      row.some((cell) =>
        normalizeForClassification(cell.value).includes(keyword),
      ),
    ).length;

    if (matchCount >= 2) {
      return {
        rowIndex: i,
        headersByColumn: new Map(
          row.map((cell) => [cell.columnIndex, cell.value] as const),
        ),
      };
    }
  }

  return { rowIndex: -1, headersByColumn: new Map() };
}

function formatExcelSheet(
  name: string,
  rows: ExtractedExcelCell[][],
): string | null {
  if (rows.length === 0) {
    return null;
  }

  const formattedRows: string[] = [];
  const { rowIndex: headerRowIndex, headersByColumn } = findHeaderRow(rows);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (i === headerRowIndex) {
      formattedRows.push(
        `[COLUMNS: ${row.map((cell) => `${cell.address} ${cell.value}`).join(', ')}]`,
      );
      continue;
    }

    const parts: string[] = [];
    const seenValues = new Set<string>();

    for (const cell of row) {
      if (
        cell.isFormula ||
        isPlaceholderCell(cell.value) ||
        isScoringOptionsCell(cell.value)
      ) {
        continue;
      }

      const normalizedValue = normalizeForClassification(cell.value);
      if (seenValues.has(normalizedValue)) {
        continue;
      }
      seenValues.add(normalizedValue);

      const header = headersByColumn.get(cell.columnIndex);
      const label = inferCellLabel(cell, header);
      const headerPrefix = header ? ` ${header}` : '';
      parts.push(`[${cell.address} ${label}${headerPrefix}] ${cell.value}`);
    }

    if (parts.length > 0) {
      const rowNumber = row[0]?.address.match(/\d+$/)?.[0] ?? String(i + 1);
      formattedRows.push(`[ROW ${rowNumber}] ${parts.join(' | ')}`);
    }
  }

  if (formattedRows.length === 0) {
    return null;
  }

  return `=== Sheet: ${name} ===\n${formattedRows.join('\n')}`;
}

/**
 * Extracts content from a file based on its MIME type
 * Supports: Excel, CSV, text, PDF, and images
 */
export async function extractContentFromFile(
  fileData: string,
  fileType: string,
  logger: ContentExtractionLogger = defaultLogger,
): Promise<string> {
  const fileBuffer = Buffer.from(fileData, 'base64');

  if (fileType === 'application/vnd.ms-excel') {
    throw new Error(
      'Legacy Excel files (.xls) are not reliably supported. Please convert the questionnaire to .xlsx, CSV, PDF, or DOCX.',
    );
  }

  // Handle Excel files (.xlsx, .xls)
  if (isExcelFile(fileType)) {
    return extractFromExcel(fileBuffer, fileType, logger);
  }

  // Handle CSV files
  if (isCsvFile(fileType)) {
    return extractFromCsv(fileBuffer);
  }

  // Handle plain text files
  if (isTextFile(fileType)) {
    return fileBuffer.toString('utf-8');
  }

  // Handle Word documents (.docx) — extract text with mammoth
  if (isDocxFile(fileType)) {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  }

  // Legacy .doc files are not supported
  if (fileType === 'application/msword') {
    throw new Error(
      'Legacy Word documents (.doc) are not supported. Please convert to .docx or PDF format.',
    );
  }

  // Handle PDFs using Claude's native multi-page PDF support
  if (isPdfFile(fileType)) {
    return extractFromPdf(fileData, logger);
  }

  // Handle images using OpenAI vision API
  if (isImageFile(fileType)) {
    return extractFromVision(fileData, fileType, logger);
  }

  throw new Error(
    `Unsupported file type: ${fileType}. Supported formats: PDF, Word (.docx), images (PNG, JPG, etc.), Excel (.xlsx, .xls), CSV, text files (.txt).`,
  );
}

/**
 * AI-powered question extraction directly from file
 * Uses Gemini for speed, falls back to library + GPT if needed
 */
export async function extractQuestionsWithAI(
  fileData: string,
  fileType: string,
  logger: ContentExtractionLogger = defaultLogger,
): Promise<{ question: string; answer: string | null }[]> {
  const startTime = Date.now();

  try {
    const content = await extractContentFromFile(fileData, fileType, logger);
    logger.info('Extracted content for questionnaire classification', {
      contentLength: content.length,
      extractionMs: Date.now() - startTime,
    });
    return parseQuestionsAndAnswers(content, logger);
  } catch (error) {
    logger.error('AI extraction failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    });
    throw error;
  }
}

/**
 * Structured raw content extraction for Excel files.
 * ExcelJS is the primary path; XML is only a fallback for unusual workbooks.
 */
async function extractExcelRawContent(
  fileBuffer: Buffer,
  logger: ContentExtractionLogger,
): Promise<string> {
  try {
    const result = await extractFromExcelStandard(fileBuffer);
    if (result.length > 100) {
      return result;
    }
    logger.info('ExcelJS returned minimal raw content, trying XML fallback');
  } catch (error) {
    logger.warn('ExcelJS raw extraction failed, trying XML fallback', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }

  return extractFromExcelXml(fileBuffer, logger);
}

// File type detection helpers
function isExcelFile(fileType: string): boolean {
  return (
    fileType === 'application/vnd.ms-excel' ||
    fileType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileType === 'application/vnd.ms-excel.sheet.macroEnabled.12'
  );
}

function isCsvFile(fileType: string): boolean {
  return fileType === 'text/csv' || fileType === 'text/comma-separated-values';
}

function isTextFile(fileType: string): boolean {
  return fileType === 'text/plain' || fileType.startsWith('text/');
}

function isDocxFile(fileType: string): boolean {
  return (
    fileType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}

function isPdfFile(fileType: string): boolean {
  return fileType === 'application/pdf';
}

function isImageFile(fileType: string): boolean {
  return fileType.startsWith('image/');
}

/**
 * Extracts sheet names from the workbook XML inside an xlsx zip archive
 */
function extractSheetNames(zip: AdmZip): string[] {
  try {
    const workbookEntry = zip.getEntry('xl/workbook.xml');
    if (!workbookEntry) return [];

    const content = workbookEntry.getData().toString('utf8');
    const names: string[] = [];
    const sheetPattern = /<sheet[^>]+name="([^"]*)"[^>]*\/>/g;
    let m: RegExpExecArray | null;

    while ((m = sheetPattern.exec(content)) !== null) {
      names.push(m[1]);
    }

    return names;
  } catch {
    return [];
  }
}

/**
 * Extracts shared strings from Excel file, handling rich text with namespace prefixes
 * Some Excel files use <d:t> instead of <t> for rich text, which standard libraries miss
 */
function extractSharedStrings(fileBuffer: Buffer): string[] {
  try {
    const zip = new AdmZip(fileBuffer);
    const sharedStringsEntry = zip.getEntry('xl/sharedStrings.xml');

    if (!sharedStringsEntry) {
      return [];
    }

    const content = sharedStringsEntry.getData().toString('utf8');
    const strings: string[] = [];

    // Match all <si>...</si> (string item) elements
    const siMatches = content.match(/<si>[\s\S]*?<\/si>/g) || [];

    for (const si of siMatches) {
      // Extract text from both <t>...</t> and <d:t>...</d:t> (or any namespace:t)
      const textMatches = si.match(/<[^>]*:?t[^>]*>([^<]*)<\/[^>]*:?t>/g) || [];

      let fullText = '';
      for (const match of textMatches) {
        // Extract just the text content between tags
        const textContent = match.replace(/<[^>]*>/g, '');
        fullText += textContent;
      }

      strings.push(fullText.trim());
    }

    return strings;
  } catch {
    return [];
  }
}

/**
 * Extracts cell values directly from sheet XML, resolving shared string references
 * This bypasses xlsx library bugs with rich text cells
 */
function extractSheetData(
  zip: AdmZip,
  sheetIndex: number,
  sharedStrings: string[],
): ExtractedExcelCell[][] {
  const sheetEntry = zip.getEntry(`xl/worksheets/sheet${sheetIndex + 1}.xml`);
  if (!sheetEntry) return [];

  const content = sheetEntry.getData().toString('utf8');
  const rows: Map<number, ExtractedExcelCell[]> = new Map();

  // Match normal and self-closing cells without accidentally spanning columns.
  const cellPattern = /<c r="([A-Z]+)(\d+)"[^>]*(?:\/>|>[\s\S]*?<\/c>)/g;
  let match: RegExpExecArray | null;

  while ((match = cellPattern.exec(content)) !== null) {
    const col = match[1];
    const rowNum = parseInt(match[2]) - 1; // 0-indexed
    const cellXml = match[0];

    // Convert column letter to index (A=0, B=1, etc.)
    let colNum = 0;
    for (let i = 0; i < col.length; i++) {
      colNum = colNum * 26 + (col.charCodeAt(i) - 64);
    }
    colNum -= 1; // 0-indexed

    if (colNum > 29) continue;

    // Check if this is a shared string cell (t="s")
    const isSharedString = /t="s"/.test(cellXml);

    // Extract value
    let value = '';
    const vMatch = cellXml.match(/<v>([^<]*)<\/v>/);

    if (vMatch) {
      if (isSharedString) {
        // Shared string reference - look up in our extracted strings
        const idx = parseInt(vMatch[1]);
        value = sharedStrings[idx] || '';
      } else {
        value = vMatch[1];
      }
    }

    const trimmedValue = normalizeCellText(value);
    if (!trimmedValue) {
      continue;
    }

    if (!rows.has(rowNum)) {
      rows.set(rowNum, []);
    }

    rows.get(rowNum)!.push({
      address: `${col}${rowNum + 1}`,
      columnIndex: colNum + 1,
      value: trimmedValue,
      isFormula: /<f(?:\s|>)/.test(cellXml),
    });
  }

  const result: ExtractedExcelCell[][] = [];
  const maxRow = Math.max(...Array.from(rows.keys()), -1);

  for (let r = 0; r <= maxRow; r++) {
    result.push(rows.get(r) ?? []);
  }

  return result;
}

/**
 * Fallback extraction using raw worksheet XML for unusual Excel files.
 */
function extractFromExcelXml(
  fileBuffer: Buffer,
  logger: ContentExtractionLogger,
): string {
  try {
    const zip = new AdmZip(fileBuffer);
    const sharedStrings = extractSharedStrings(fileBuffer);
    const sheetNames = extractSheetNames(zip);
    const sheets: string[] = [];

    logger.info('Trying XML Excel fallback', {
      sharedStringCount: sharedStrings.length,
      sheetCount: sheetNames.length,
    });

    for (let sheetIdx = 0; sheetIdx < sheetNames.length; sheetIdx++) {
      const sheet = formatExcelSheet(
        sheetNames[sheetIdx],
        extractSheetData(zip, sheetIdx, sharedStrings),
      );
      if (sheet) {
        sheets.push(sheet);
      }
    }

    return sheets.join('\n\n');
  } catch (error) {
    throw new Error(
      `Failed to parse Excel file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

/**
 * Primary extraction using ExcelJS so rows, columns, merged cells, and formulas
 * are interpreted by the workbook parser instead of regex over raw XML.
 */
async function extractFromExcelStandard(fileBuffer: Buffer): Promise<string> {
  const workbook = await loadXlsxWorkbook(fileBuffer);
  const sheets: string[] = [];

  for (const worksheet of workbook.worksheets) {
    const rows: ExtractedExcelCell[][] = [];

    worksheet.eachRow((row) => {
      const cells: ExtractedExcelCell[] = [];

      for (
        let columnIndex = 1;
        columnIndex <= Math.min(row.cellCount, 30);
        columnIndex++
      ) {
        const cell = row.getCell(columnIndex);
        const value = getExcelCellText(cell);

        if (!value) {
          continue;
        }

        cells.push({
          address: `${columnNameFromIndex(columnIndex)}${row.number}`,
          columnIndex,
          value,
          isFormula: hasFormulaValue(cell.value),
        });
      }

      if (cells.length > 0) {
        rows.push(cells);
      }
    });

    const sheet = formatExcelSheet(worksheet.name, rows);
    if (sheet) {
      sheets.push(sheet);
    }
  }

  return sheets.join('\n\n');
}

// Content extraction functions
async function extractFromExcel(
  fileBuffer: Buffer,
  fileType: string,
  logger: ContentExtractionLogger,
): Promise<string> {
  const excelStartTime = Date.now();
  const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

  logger.info('Processing Excel file', { fileType, fileSizeMB });

  // Must run before extractExcelRawContent: its catch falls back to the
  // AdmZip XML path, which would inflate an oversized archive anyway.
  assertXlsxDecompressionWithinLimit(fileBuffer);

  const result = await extractExcelRawContent(fileBuffer, logger);

  const extractionTime = ((Date.now() - excelStartTime) / 1000).toFixed(2);
  logger.info('Excel file processed', {
    fileSizeMB,
    extractedLength: result.length,
    extractionTimeSeconds: extractionTime,
  });

  return result;
}

function extractFromCsv(fileBuffer: Buffer): string {
  const text = fileBuffer.toString('utf-8');
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n');
}

/**
 * Extract raw text content from a PDF using Claude's native multi-page support
 */
async function extractFromPdf(
  fileData: string,
  logger: ContentExtractionLogger,
): Promise<string> {
  const fileBuffer = Buffer.from(fileData, 'base64');
  const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

  logger.info('Extracting content from PDF using Claude', {
    fileSizeMB,
  });

  const startTime = Date.now();

  try {
    const pdf = await PDFDocument.load(fileBuffer);
    const pageCount = pdf.getPageCount();
    const shouldSplit = pageCount > 10 || fileBuffer.length > 10 * 1024 * 1024;
    const text = shouldSplit
      ? await extractPdfByPage({ pdf, pageCount, logger })
      : await extractPdfText({
          fileData,
          logger,
          label: 'PDF document',
        });

    const extractionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('Content extracted from PDF', {
      extractedLength: text.length,
      pageCount,
      splitByPage: shouldSplit,
      extractionTimeSeconds: extractionTime,
    });

    return text;
  } catch (error) {
    const extractionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error('Failed to extract content from PDF', {
      fileSizeMB,
      extractionTimeSeconds: extractionTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(
      `Failed to extract PDF content: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

async function extractPdfByPage(params: {
  pdf: PDFDocument;
  pageCount: number;
  logger: ContentExtractionLogger;
}): Promise<string> {
  const pageIndexes = Array.from(
    { length: params.pageCount },
    (_, index) => index,
  );
  const pageTexts = await mapWithConcurrency(
    pageIndexes,
    1,
    async (pageIndex) => {
      const pagePdf = await PDFDocument.create();
      const [page] = await pagePdf.copyPages(params.pdf, [pageIndex]);
      pagePdf.addPage(page);
      const bytes = await pagePdf.save();
      const text = await extractPdfText({
        fileData: Buffer.from(bytes).toString('base64'),
        logger: params.logger,
        label: `PDF page ${pageIndex + 1}`,
      });
      return `--- PDF Page ${pageIndex + 1} ---\n${text}`;
    },
  );

  return pageTexts.join('\n\n');
}

async function extractPdfText(params: {
  fileData: string;
  logger: ContentExtractionLogger;
  label: string;
}): Promise<string> {
  try {
    return await extractPdfWithClaude(params);
  } catch (error) {
    params.logger.warn('Claude PDF extraction failed, trying OpenAI fallback', {
      label: params.label,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return extractPdfWithOpenAI(params);
  }
}

async function extractPdfWithClaude(params: {
  fileData: string;
  logger: ContentExtractionLogger;
  label: string;
}): Promise<string> {
  params.logger.info('Extracting PDF text with Claude', {
    label: params.label,
  });
  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: VISION_EXTRACTION_PROMPT },
          {
            type: 'file',
            data: params.fileData,
            mediaType: 'application/pdf',
          },
        ],
      },
    ],
  });

  return text;
}

async function extractPdfWithOpenAI(params: {
  fileData: string;
  logger: ContentExtractionLogger;
  label: string;
}): Promise<string> {
  params.logger.info('Extracting PDF text with OpenAI fallback', {
    label: params.label,
  });
  const { text } = await generateText({
    model: openai(PARSING_MODEL),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: VISION_EXTRACTION_PROMPT },
          {
            type: 'file',
            data: params.fileData,
            mediaType: 'application/pdf',
          },
        ],
      },
    ],
  });

  return text;
}

async function extractFromVision(
  fileData: string,
  fileType: string,
  logger: ContentExtractionLogger,
): Promise<string> {
  const fileSizeMB = (
    Buffer.from(fileData, 'base64').length /
    (1024 * 1024)
  ).toFixed(2);

  logger.info('Extracting content from PDF/image using vision API', {
    fileType,
    fileSizeMB,
  });

  const startTime = Date.now();

  try {
    const { text } = await generateText({
      model: openai(PARSING_MODEL),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: VISION_EXTRACTION_PROMPT },
            { type: 'image', image: `data:${fileType};base64,${fileData}` },
          ],
        },
      ],
    });

    const extractionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('Content extracted from PDF/image', {
      fileType,
      extractedLength: text.length,
      extractionTimeSeconds: extractionTime,
    });

    return text;
  } catch (error) {
    const extractionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error('Failed to extract content from PDF/image', {
      fileType,
      fileSizeMB,
      extractionTimeSeconds: extractionTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(
      `Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
