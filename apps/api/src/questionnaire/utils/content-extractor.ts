import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { createGroq } from '@ai-sdk/groq';
import { generateText, generateObject, jsonSchema } from 'ai';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import { PARSING_MODEL, VISION_EXTRACTION_PROMPT } from './constants';

// Initialize Groq - ultra fast inference
const groq = createGroq();

// Schema for question extraction
const questionExtractionSchema = jsonSchema<{
  questions: { question: string; answer: string | null }[];
}>({
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The full question text' },
          answer: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'The answer/response if provided, null if empty',
          },
        },
        required: ['question'],
      },
    },
  },
  required: ['questions'],
});

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

  // Handle Word documents - not directly supported
  if (isWordDocument(fileType)) {
    throw new Error(
      'Word documents (.docx) are best converted to PDF or image format for parsing. Alternatively, use a URL to view the document.',
    );
  }

  // For images and PDFs, use OpenAI vision API
  if (isImageOrPdf(fileType)) {
    return extractFromVision(fileData, fileType, logger);
  }

  throw new Error(
    `Unsupported file type: ${fileType}. Supported formats: PDF, images (PNG, JPG, etc.), Excel (.xlsx, .xls), CSV, text files (.txt).`,
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
    // For Excel files - use simple library extraction then AI parsing
    if (isExcelFile(fileType)) {
      const fileBuffer = Buffer.from(fileData, 'base64');
      const rawContent = extractExcelRawContent(fileBuffer, logger);

      logger.info('Extracted raw Excel content', {
        contentLength: rawContent.length,
        extractionMs: Date.now() - startTime,
      });

      // Use Groq for ultra-fast AI parsing (~5-10 seconds)
      return await parseQuestionsWithGroq(rawContent, logger);
    }

    // For CSV - simple text parsing
    if (isCsvFile(fileType)) {
      const fileBuffer = Buffer.from(fileData, 'base64');
      const content = fileBuffer.toString('utf-8');
      return await parseQuestionsWithGroq(content, logger);
    }

    // For PDF/images - use vision
    if (isImageOrPdf(fileType)) {
      return await parseQuestionsWithVision(fileData, fileType, logger);
    }

    throw new Error(`Unsupported file type for AI extraction: ${fileType}`);
  } catch (error) {
    logger.error('AI extraction failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    });
    throw error;
  }
}

/**
 * Simple raw content extraction - just dump all cell values
 * No smart header detection, let AI figure it out
 */
function extractExcelRawContent(
  fileBuffer: Buffer,
  logger: ContentExtractionLogger,
): string {
  // Try custom XML parser first (handles rich text)
  try {
    const zip = new AdmZip(fileBuffer);
    const sharedStrings = extractSharedStrings(fileBuffer);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const allContent: string[] = [];

    for (let sheetIdx = 0; sheetIdx < workbook.SheetNames.length; sheetIdx++) {
      const sheetName = workbook.SheetNames[sheetIdx];
      const rows = extractSheetData(zip, sheetIdx, sharedStrings);

      if (rows.length === 0) continue;

      allContent.push(`\n--- ${sheetName} ---`);

      for (const row of rows) {
        const nonEmpty = row.filter((cell) => cell.trim());
        if (nonEmpty.length > 0) {
          allContent.push(nonEmpty.join(' | '));
        }
      }
    }

    const result = allContent.join('\n');

    // If custom parser got content, use it
    if (result.length > 100) {
      return result;
    }
  } catch (error) {
    logger.warn('Custom XML parser failed', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }

  // Fallback to standard xlsx library
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const allContent: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    });

    allContent.push(`\n--- ${sheetName} ---`);

    for (const row of data) {
      const cells = row as unknown[];
      const nonEmpty = cells.map((c) => String(c).trim()).filter((c) => c);
      if (nonEmpty.length > 0) {
        allContent.push(nonEmpty.join(' | '));
      }
    }
  }

  return allContent.join('\n');
}

const QUESTION_PROMPT = `Extract all questions/fields and their answers from this questionnaire or form data.

Rules:
- Extract BOTH traditional questions (ending with "?") AND form fields that request information
- Form fields like "1.1 Vendor Name", "2.3 Company Address", "Contact Email" are valid questions - they request user input
- Numbered items (1.1, 1.2, 2.1, etc.) followed by a label are questions
- Items marked with "*" or "(required)" are definitely questions
- Items with notes like "(Single selection allowed)", "(Allows other)", "(Multiple selections allowed)" are questions
- Match each question/field to its response/answer from the same row or adjacent cell
- If no answer is provided, set answer to null
- Skip pure section headers (like "Section 1: General Information") but keep numbered fields within sections
- Keep the full question/field text including any notes about selection type

Content:
`;

/**
 * Parse questions using Groq (PRIMARY - ultra fast)
 * For large content: chunks and processes in parallel
 */
async function parseQuestionsWithGroq(
  content: string,
  logger: ContentExtractionLogger,
): Promise<{ question: string; answer: string | null }[]> {
  const startTime = Date.now();
  const CHUNK_SIZE = 25000; // Leave room for prompt in 32k context

  try {
    // If content fits in one chunk, process directly
    if (content.length <= CHUNK_SIZE) {
      logger.info('Starting Groq parsing (single chunk)...', {
        contentLength: content.length,
      });
      return await parseChunkWithGroq(content, logger);
    }

    // Split content into chunks for parallel processing
    const chunks = splitIntoChunks(content, CHUNK_SIZE);
    logger.info('Starting Groq parsing (chunked)...', {
      contentLength: content.length,
      chunkCount: chunks.length,
    });

    // Process all chunks in parallel
    const chunkResults = await Promise.all(
      chunks.map((chunk, idx) => {
        logger.info(`Processing chunk ${idx + 1}/${chunks.length}...`);
        return parseChunkWithGroq(chunk, logger);
      }),
    );

    // Merge and deduplicate results
    const allQuestions = chunkResults.flat();
    const uniqueQuestions = deduplicateQuestions(allQuestions);

    logger.info('Groq chunked parsing complete', {
      totalQuestions: uniqueQuestions.length,
      chunksProcessed: chunks.length,
      durationMs: Date.now() - startTime,
    });

    return uniqueQuestions;
  } catch (error) {
    logger.error('Groq parsing failed, trying Claude', {
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs: Date.now() - startTime,
    });

    // Fallback to Claude (has 200k context, no chunking needed)
    return parseQuestionsWithClaude(content, logger);
  }
}

/**
 * Parse a single chunk with Groq
 */
async function parseChunkWithGroq(
  content: string,
  logger: ContentExtractionLogger,
): Promise<{ question: string; answer: string | null }[]> {
  const { object } = await generateObject({
    model: groq('openai/gpt-oss-120b'),
    schema: questionExtractionSchema,
    prompt: QUESTION_PROMPT + content,
  });

  const result = object as {
    questions: { question: string; answer: string | null }[];
  };

  return (result.questions || [])
    .map((q) => ({
      question: q.question?.trim() || '',
      answer: q.answer?.trim() || null,
    }))
    .filter((q) => q.question);
}

/**
 * Split content into chunks, trying to break at section boundaries
 */
function splitIntoChunks(content: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const lines = content.split('\n');
  let currentChunk: string[] = [];
  let currentSize = 0;

  for (const line of lines) {
    const lineSize = line.length + 1; // +1 for newline

    // If adding this line would exceed limit, start new chunk
    if (currentSize + lineSize > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
      currentChunk = [];
      currentSize = 0;
    }

    currentChunk.push(line);
    currentSize += lineSize;
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  return chunks;
}

/**
 * Deduplicate questions by comparing normalized text
 */
function deduplicateQuestions(
  questions: { question: string; answer: string | null }[],
): { question: string; answer: string | null }[] {
  const seen = new Set<string>();
  const unique: { question: string; answer: string | null }[] = [];

  for (const q of questions) {
    // Normalize: lowercase, remove extra spaces, remove numbering prefix
    const normalized = q.question
      .toLowerCase()
      .replace(/^\d+\.\d+\s*/, '') // Remove "1.1 " prefix
      .replace(/\s+/g, ' ')
      .trim();

    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(q);
    }
  }

  return unique;
}

/**
 * Parse questions using Claude (fallback - excellent quality)
 */
async function parseQuestionsWithClaude(
  content: string,
  logger: ContentExtractionLogger,
): Promise<{ question: string; answer: string | null }[]> {
  const startTime = Date.now();

  try {
    logger.info('Starting Claude parsing...', {
      contentLength: content.length,
    });

    const { object } = await generateObject({
      model: anthropic('claude-3-5-sonnet-latest'),
      schema: questionExtractionSchema,
      prompt: QUESTION_PROMPT + content.substring(0, 80000),
    });

    const result = object as {
      questions: { question: string; answer: string | null }[];
    };

    logger.info('Claude parsing complete', {
      questionCount: result.questions?.length || 0,
      durationMs: Date.now() - startTime,
      model: 'claude-3-5-sonnet',
    });

    return (result.questions || [])
      .map((q) => ({
        question: q.question?.trim() || '',
        answer: q.answer?.trim() || null,
      }))
      .filter((q) => q.question);
  } catch (error) {
    logger.error('Claude parsing failed, trying OpenAI', {
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs: Date.now() - startTime,
    });

    // Fallback to OpenAI
    return parseQuestionsWithOpenAI(content, logger);
  }
}

/**
 * Fallback: Parse questions using OpenAI
 */
async function parseQuestionsWithOpenAI(
  content: string,
  logger: ContentExtractionLogger,
): Promise<{ question: string; answer: string | null }[]> {
  const startTime = Date.now();

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: questionExtractionSchema,
    prompt: `Extract all questions/fields and their answers from this questionnaire or form.

Include:
- Traditional questions ending with "?"
- Form fields like "1.1 Vendor Name", "Contact Email" that request input
- Numbered items (1.1, 1.2) followed by field labels
- Items marked with "*" or selection notes like "(Single selection allowed)"

Match each to its response if provided. Set answer to null if empty.

${content.substring(0, 80000)}`,
  });

  const result = object as {
    questions: { question: string; answer: string | null }[];
  };

  logger.info('OpenAI parsing complete', {
    questionCount: result.questions?.length || 0,
    durationMs: Date.now() - startTime,
  });

  return (result.questions || [])
    .map((q) => ({
      question: q.question?.trim() || '',
      answer: q.answer?.trim() || null,
    }))
    .filter((q) => q.question);
}

/**
 * Parse questions from PDF/image using vision
 */
async function parseQuestionsWithVision(
  fileData: string,
  fileType: string,
  logger: ContentExtractionLogger,
): Promise<{ question: string; answer: string | null }[]> {
  const startTime = Date.now();

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: questionExtractionSchema,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract all questions/fields and their answers from this questionnaire or form document.

Include:
- Traditional questions ending with "?"
- Form fields like "1.1 Vendor Name", "Contact Email" that request input
- Numbered items (1.1, 1.2, 2.1) followed by field labels
- Items marked with "*" or selection notes like "(Single selection allowed)"

Match each to its response if provided. Set answer to null if empty.`,
          },
          {
            type: 'image',
            image: `data:${fileType};base64,${fileData}`,
          },
        ],
      },
    ],
  });

  const result = object as {
    questions: { question: string; answer: string | null }[];
  };

  logger.info('Vision parsing complete', {
    questionCount: result.questions?.length || 0,
    durationMs: Date.now() - startTime,
  });

  return (result.questions || [])
    .map((q) => ({
      question: q.question?.trim() || '',
      answer: q.answer?.trim() || null,
    }))
    .filter((q) => q.question);
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

function isWordDocument(fileType: string): boolean {
  return (
    fileType === 'application/msword' ||
    fileType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}

function isImageOrPdf(fileType: string): boolean {
  return fileType.startsWith('image/') || fileType === 'application/pdf';
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
): string[][] {
  const sheetEntry = zip.getEntry(`xl/worksheets/sheet${sheetIndex + 1}.xml`);
  if (!sheetEntry) return [];

  const content = sheetEntry.getData().toString('utf8');
  const rows: Map<number, Map<number, string>> = new Map();

  // Match all cell elements: <c r="A1" ...>...</c>
  const cellPattern = /<c r="([A-Z]+)(\d+)"[^>]*>[\s\S]*?<\/c>/g;
  let match;

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

    // Only process first 10 columns
    if (colNum > 9) continue;

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

    if (!rows.has(rowNum)) {
      rows.set(rowNum, new Map());
    }
    rows.get(rowNum)!.set(colNum, value.trim());
  }

  // Convert to 2D array
  const maxRow = Math.max(...Array.from(rows.keys()), 0);
  const result: string[][] = [];

  for (let r = 0; r <= maxRow; r++) {
    const row: string[] = [];
    const rowData = rows.get(r);
    for (let c = 0; c <= 9; c++) {
      row.push(rowData?.get(c) || '');
    }
    result.push(row);
  }

  return result;
}

/**
 * Fallback extraction using standard xlsx library (for simple Excel files)
 */
function extractFromExcelStandard(
  fileBuffer: Buffer,
  logger: ContentExtractionLogger,
): string {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    });

    if (jsonData.length === 0) continue;

    const formattedRows: string[] = [];
    let headerRowIndex = -1;
    let columnHeaders: string[] = [];

    // Find header row
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (!Array.isArray(row)) continue;
      const rowLower = row.map((cell) => String(cell).toLowerCase().trim());
      const headerKeywords = [
        'question',
        'response',
        'answer',
        'comment',
        'attachment',
      ];
      const matchCount = headerKeywords.filter((kw) =>
        rowLower.some((cell) => cell.includes(kw)),
      ).length;

      if (matchCount >= 2) {
        headerRowIndex = i;
        columnHeaders = row.map((cell) => String(cell).trim());
        break;
      }
    }

    // Process rows
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!Array.isArray(row)) continue;

      const cells = row.map((cell) =>
        cell !== null && cell !== undefined ? String(cell).trim() : '',
      );
      const hasContent = cells.some((cell) => cell !== '');
      if (!hasContent) continue;

      if (i === headerRowIndex) {
        formattedRows.push(`[COLUMNS: ${cells.filter((c) => c).join(', ')}]`);
        continue;
      }

      if (headerRowIndex !== -1 && i > headerRowIndex) {
        const parts: string[] = [];
        for (let j = 0; j < Math.min(cells.length, 10); j++) {
          const header = columnHeaders[j] || `Col${j + 1}`;
          const value = cells[j] || '';
          if (value) {
            parts.push(`[${header}] ${value}`);
          }
        }
        if (parts.length > 0) {
          formattedRows.push(parts.join(' | '));
        }
      } else {
        const nonEmptyCells = cells.filter((c) => c).slice(0, 10);
        if (nonEmptyCells.length > 0) {
          formattedRows.push(nonEmptyCells.join(' | '));
        }
      }
    }

    if (formattedRows.length > 0) {
      sheets.push(`=== Sheet: ${sheetName} ===\n${formattedRows.join('\n')}`);
    }
  }

  return sheets.join('\n\n');
}

// Content extraction functions
function extractFromExcel(
  fileBuffer: Buffer,
  fileType: string,
  logger: ContentExtractionLogger,
): string {
  const excelStartTime = Date.now();
  const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

  logger.info('Processing Excel file', { fileType, fileSizeMB });

  let result = '';

  try {
    // First try: Custom XML parser (handles rich text with namespace prefixes)
    const zip = new AdmZip(fileBuffer);
    const sharedStrings = extractSharedStrings(fileBuffer);

    logger.info('Extracted shared strings', {
      count: sharedStrings.length,
    });

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheets: string[] = [];

    for (let sheetIdx = 0; sheetIdx < workbook.SheetNames.length; sheetIdx++) {
      const sheetName = workbook.SheetNames[sheetIdx];
      const rows = extractSheetData(zip, sheetIdx, sharedStrings);

      if (rows.length === 0) continue;

      const formattedRows: string[] = [];
      let headerRowIndex = -1;
      let columnHeaders: string[] = [];

      // Find header row
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const rowLower = rows[i].map((cell) => cell.toLowerCase());
        const headerKeywords = [
          'question',
          'response',
          'answer',
          'comment',
          'attachment',
        ];
        const matchCount = headerKeywords.filter((kw) =>
          rowLower.some((cell) => cell.includes(kw)),
        ).length;

        if (matchCount >= 2) {
          headerRowIndex = i;
          columnHeaders = rows[i];
          break;
        }
      }

      // Process rows
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const hasContent = row.some((cell) => cell !== '');
        if (!hasContent) continue;

        if (i === headerRowIndex) {
          formattedRows.push(`[COLUMNS: ${row.filter((c) => c).join(', ')}]`);
          continue;
        }

        if (headerRowIndex !== -1 && i > headerRowIndex) {
          const parts: string[] = [];
          for (let j = 0; j < columnHeaders.length; j++) {
            const header = columnHeaders[j] || `Col${j + 1}`;
            const value = row[j] || '';
            if (value) {
              parts.push(`[${header}] ${value}`);
            }
          }
          if (parts.length > 0) {
            formattedRows.push(parts.join(' | '));
          }
        } else {
          const nonEmptyCells = row.filter((c) => c);
          if (nonEmptyCells.length > 0) {
            formattedRows.push(nonEmptyCells.join(' | '));
          }
        }
      }

      if (formattedRows.length > 0) {
        sheets.push(`=== Sheet: ${sheetName} ===\n${formattedRows.join('\n')}`);
      }
    }

    result = sheets.join('\n\n');

    // If custom parser returned empty/minimal content, try standard library
    if (result.length < 100) {
      logger.info(
        'Custom parser returned minimal content, trying standard library',
      );
      result = extractFromExcelStandard(fileBuffer, logger);
    }
  } catch (error) {
    // Fallback to standard xlsx library if custom parser fails
    logger.warn('Custom Excel parser failed, using standard library', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    result = extractFromExcelStandard(fileBuffer, logger);
  }

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
