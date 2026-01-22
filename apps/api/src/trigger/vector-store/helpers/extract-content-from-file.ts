import { logger } from '@/vector-store/logger';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

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

      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

      // Process sheets sequentially
      const sheets: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        });

        // Convert to readable text format
        const sheetText = jsonData
          .map((row: any) => {
            if (Array.isArray(row)) {
              return row
                .filter(
                  (cell) => cell !== null && cell !== undefined && cell !== '',
                )
                .join(' | ');
            }
            return String(row);
          })
          .filter((line: string) => line.trim() !== '')
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

  // For images and PDFs, use OpenAI vision API
  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';

  if (isImage || isPdf) {
    const base64Data = fileData;
    const mimeType = fileType;
    const fileSizeMB = (
      Buffer.from(fileData, 'base64').length /
      (1024 * 1024)
    ).toFixed(2);

    logger.info('Extracting content from PDF/image using vision API', {
      fileType: mimeType,
      fileSizeMB,
    });

    const startTime = Date.now();

    try {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'), // Using gpt-4o-mini for better text extraction
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all text content from this document. Preserve the structure, formatting, and order of the content. Include all paragraphs, headings, lists, tables, and any other text elements. Return the extracted text in a clear, readable format.`,
              },
              {
                type: 'image',
                image: `data:${mimeType};base64,${base64Data}`,
              },
            ],
          },
        ],
      });

      const extractionTime = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('Content extracted from PDF/image', {
        fileType: mimeType,
        extractedLength: text.length,
        extractionTimeSeconds: extractionTime,
      });

      return text;
    } catch (error) {
      const extractionTime = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error('Failed to extract content from PDF/image', {
        fileType: mimeType,
        fileSizeMB,
        extractionTimeSeconds: extractionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // For other file types that might be binary formats, provide helpful error message
  throw new Error(
    `Unsupported file type: ${fileType}. Supported formats: PDF, images (PNG, JPG, etc.), Excel (.xlsx, .xls), CSV, text files (.txt, .md), Word documents (.docx). Legacy Word documents (.doc) should be converted to .docx or PDF.`,
  );
}
