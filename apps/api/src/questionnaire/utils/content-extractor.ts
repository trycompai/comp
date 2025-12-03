import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import * as XLSX from 'xlsx';
import { PARSING_MODEL, VISION_EXTRACTION_PROMPT } from './constants';

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

// Content extraction functions
function extractFromExcel(
  fileBuffer: Buffer,
  fileType: string,
  logger: ContentExtractionLogger,
): string {
  const excelStartTime = Date.now();
  const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

  logger.info('Processing Excel file', { fileType, fileSizeMB });

  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    });

    const sheetText = (jsonData as unknown[][])
      .map((row) => {
        if (Array.isArray(row)) {
          return row
            .filter((cell) => cell !== null && cell !== undefined && cell !== '')
            .join(' | ');
        }
        return String(row);
      })
      .filter((line) => line.trim() !== '')
      .join('\n');

    if (sheetText.trim()) {
      sheets.push(`Sheet: ${sheetName}\n${sheetText}`);
    }
  }

  const extractionTime = ((Date.now() - excelStartTime) / 1000).toFixed(2);
  logger.info('Excel file processed', {
    fileSizeMB,
    totalSheets: workbook.SheetNames.length,
    extractedLength: sheets.join('\n\n').length,
    extractionTimeSeconds: extractionTime,
  });

  return sheets.join('\n\n');
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

