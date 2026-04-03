import { logger } from '@/vector-store/logger';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';

/**
 * Loads an Excel workbook from a Uint8Array/Buffer.
 * ExcelJS type declarations are incompatible with Node 22+ / TS 5.8+ Buffer types,
 * so we use a typed wrapper to avoid the mismatch.
 */
async function loadWorkbook(data: Uint8Array): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  type LoadFn = (data: Uint8Array) => Promise<ExcelJS.Workbook>;
  await (workbook.xlsx.load as unknown as LoadFn)(data);
  return workbook;
}

const htmlEntityMap = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
} as const;

const decodeBasicHtmlEntities = (input: string) => {
  const entityPattern = /&(nbsp|amp|lt|gt|quot);/g;
  let decoded = input;
  let previousValue: string;

  do {
    previousValue = decoded;
    decoded = decoded.replace(
      entityPattern,
      (entity) => htmlEntityMap[entity as keyof typeof htmlEntityMap] ?? entity,
    );
  } while (decoded !== previousValue);

  return decoded;
};

/**
 * Extracts content from a file using various methods based on file type
 * Supports: PDF, Excel (.xlsx, .xls), CSV, text files (.txt, .md), Word documents (.doc, .docx), images
 */
export async function extractContentFromFile(
  fileData: string,
  fileType: string,
): Promise<string> {
  const fileBuffer = Buffer.from(fileData, 'base64');

  // Handle Excel files (.xlsx, .xls)
  if (
    fileType === 'application/vnd.ms-excel' ||
    fileType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileType === 'application/vnd.ms-excel.sheet.macroEnabled.12'
  ) {
    try {
      const excelStartTime = Date.now();
      const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

      logger.info('Processing Excel file', {
        fileType,
        fileSizeMB,
      });

      const workbook = await loadWorkbook(fileBuffer);

      // Process sheets sequentially
      const sheets: string[] = [];

      for (const worksheet of workbook.worksheets) {
        const lines: string[] = [];

        worksheet.eachRow((row) => {
          const cells = row.values as unknown[];
          // ExcelJS row.values is 1-indexed (index 0 is undefined)
          const filtered = cells
            .slice(1)
            .filter(
              (cell) => cell !== null && cell !== undefined && cell !== '',
            )
            .map((cell) => String(cell));

          if (filtered.length > 0) {
            lines.push(filtered.join(' | '));
          }
        });

        const sheetText = lines.join('\n');
        if (sheetText.trim()) {
          sheets.push(`Sheet: ${worksheet.name}\n${sheetText}`);
        }
      }

      const extractionTime = ((Date.now() - excelStartTime) / 1000).toFixed(2);
      logger.info('Excel file processed', {
        fileSizeMB,
        totalSheets: workbook.worksheets.length,
        extractedLength: sheets.join('\n\n').length,
        extractionTimeSeconds: extractionTime,
      });

      return sheets.join('\n\n');
    } catch (error) {
      throw new Error(
        `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Handle CSV files
  if (fileType === 'text/csv' || fileType === 'text/comma-separated-values') {
    try {
      const text = fileBuffer.toString('utf-8');
      // Convert CSV to readable format
      const lines = text.split('\n').filter((line) => line.trim() !== '');
      return lines.join('\n');
    } catch (error) {
      throw new Error(
        `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Handle plain text files
  if (fileType === 'text/plain' || fileType.startsWith('text/')) {
    try {
      return fileBuffer.toString('utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read text file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Handle Word documents (.docx) - extract text using mammoth library
  if (
    fileType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const docxStartTime = Date.now();
      const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

      logger.info('Processing DOCX file', {
        fileType,
        fileSizeMB,
      });

      // Extract text from DOCX using mammoth
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const text = result.value;

      // Also extract formatted text (includes formatting information)
      const formattedResult = await mammoth.convertToHtml({
        buffer: fileBuffer,
      });

      // Use formatted HTML if available, otherwise use plain text
      const extractedText = formattedResult.value || text;

      const extractionTime = ((Date.now() - docxStartTime) / 1000).toFixed(2);
      logger.info('DOCX file processed', {
        fileSizeMB,
        extractedLength: extractedText.length,
        extractionTimeSeconds: extractionTime,
      });

      // Convert HTML to plain text if needed (remove HTML tags)
      if (formattedResult.value) {
        // Simple HTML tag removal - keep text content and decode entities safely
        const plainText = decodeBasicHtmlEntities(
          extractedText.replace(/<[^>]*>/g, ' '),
        )
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim();

        return plainText || text;
      }

      return text;
    } catch (error) {
      logger.error('Failed to parse DOCX file', {
        fileType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to parse DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Handle legacy Word documents (.doc) - not supported, suggest conversion
  if (fileType === 'application/msword') {
    throw new Error(
      'Legacy Word documents (.doc) are not supported. Please convert to .docx or PDF format before uploading.',
    );
  }

  // Handle PDFs using Claude's native multi-page PDF support
  const isPdf = fileType === 'application/pdf';

  if (isPdf) {
    const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

    logger.info('Extracting content from PDF using Claude', {
      fileType,
      fileSizeMB,
    });

    const startTime = Date.now();

    try {
      const { text } = await generateText({
        model: anthropic('claude-sonnet-4-6'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text content from this document. Preserve the structure, formatting, and order of the content. Include all paragraphs, headings, lists, tables, and any other text elements. Return the extracted text in a clear, readable format.',
              },
              {
                type: 'file',
                data: fileData,
                mediaType: 'application/pdf',
              },
            ],
          },
        ],
      });

      const extractionTime = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Content extracted from PDF', {
        fileType,
        extractedLength: text.length,
        extractionTimeSeconds: extractionTime,
      });

      return text;
    } catch (error) {
      const extractionTime = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Failed to extract content from PDF', {
        fileType,
        fileSizeMB,
        extractionTimeSeconds: extractionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to extract PDF content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Handle images using OpenAI vision API
  const isImage = fileType.startsWith('image/');

  if (isImage) {
    const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

    logger.info('Extracting content from image using vision API', {
      fileType,
      fileSizeMB,
    });

    const startTime = Date.now();

    try {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text content from this image. Preserve the structure, formatting, and order of the content. Include all paragraphs, headings, lists, tables, and any other text elements. Return the extracted text in a clear, readable format.',
              },
              {
                type: 'image',
                image: `data:${fileType};base64,${fileData}`,
              },
            ],
          },
        ],
      });

      const extractionTime = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Content extracted from image', {
        fileType,
        extractedLength: text.length,
        extractionTimeSeconds: extractionTime,
      });

      return text;
    } catch (error) {
      const extractionTime = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Failed to extract content from image', {
        fileType,
        fileSizeMB,
        extractionTimeSeconds: extractionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to extract image content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // For other file types that might be binary formats, provide helpful error message
  throw new Error(
    `Unsupported file type: ${fileType}. Supported formats: PDF, images (PNG, JPG, etc.), Excel (.xlsx, .xls), CSV, text files (.txt, .md), Word documents (.docx). Legacy Word documents (.doc) should be converted to .docx or PDF.`,
  );
}
