import { extractS3KeyFromUrl } from '@/app/s3';
import { env } from '@/env.mjs';
import { openai } from '@ai-sdk/openai';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk';
import { generateObject, generateText, jsonSchema } from 'ai';
import * as XLSX from 'xlsx';
// Sync moved to answer generation tasks for better performance

interface QuestionAnswer {
  question: string;
  answer: string | null;
}

/**
 * Extracts content from a file using various methods based on file type
 */
async function extractContentFromFile(fileData: string, fileType: string): Promise<string> {
  const fileBuffer = Buffer.from(fileData, 'base64');

  // Handle Excel files (.xlsx, .xls)
  if (
    fileType === 'application/vnd.ms-excel' ||
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
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

      // Process sheets sequentially (XLSX is synchronous, but this is still fast)
      // For very large files, sheets are processed one by one to avoid memory issues
      const sheets: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        // Convert to readable text format
        const sheetText = jsonData
          .map((row: any) => {
            if (Array.isArray(row)) {
              return row
                .filter((cell) => cell !== null && cell !== undefined && cell !== '')
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

  // Handle Word documents - try to use OpenAI vision API
  if (
    fileType === 'application/msword' ||
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    throw new Error(
      'Word documents (.docx) are best converted to PDF or image format for parsing. Alternatively, use a URL to view the document.',
    );
  }

  // For images and PDFs, use OpenAI vision API
  // Note: To detect poor PDF text extraction quality (for hybrid approach):
  // 1. Check text density: words per page < 50 suggests poor extraction
  // 2. Look for question patterns: if no "?" or Q/A markers found, quality might be poor
  // 3. Check for garbled text: high ratio of non-alphanumeric characters
  // 4. Compare extracted length vs file size: very short text from large PDF suggests issues
  // 5. Missing expected patterns: if document should have tables/forms but none detected
  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';

  if (isImage || isPdf) {
    const base64Data = fileData;
    const mimeType = fileType;
    const fileSizeMB = (Buffer.from(fileData, 'base64').length / (1024 * 1024)).toFixed(2);

    logger.info('Extracting content from PDF/image using vision API', {
      fileType: mimeType,
      fileSizeMB,
    });

    const startTime = Date.now();

    try {
      const { text } = await generateText({
        model: openai('gpt-5-mini'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all text and identify question-answer pairs. Look for columns/sections labeled "Question", "Q", "Answer", "A". Match questions (ending with "?" or starting with What/How/Why/When/Is/Can/Do) to nearby answers. Preserve order. Return only Question → Answer pairs.`,
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
    `Unsupported file type: ${fileType}. Supported formats: PDF, images (PNG, JPG, etc.), Excel (.xlsx, .xls), CSV, text files (.txt), and Word documents (.docx - convert to PDF for best results).`,
  );
}

/**
 * Extracts content from a URL using Firecrawl
 */
async function extractContentFromUrl(url: string): Promise<string> {
  if (!env.FIRECRAWL_API_KEY) {
    throw new Error('Firecrawl API key is not configured');
  }

  try {
    const initialResponse = await fetch('https://api.firecrawl.dev/v1/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        urls: [url],
        prompt:
          'Extract all text content from this page, including any questions and answers, forms, or questionnaire data.',
        scrapeOptions: {
          onlyMainContent: true,
          removeBase64Images: true,
        },
      }),
    });

    const initialData = await initialResponse.json();

    if (!initialData.success || !initialData.id) {
      throw new Error('Failed to start Firecrawl extraction');
    }

    const jobId = initialData.id;
    const maxWaitTime = 1000 * 60 * 5; // 5 minutes
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(`https://api.firecrawl.dev/v1/extract/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
        },
      });

      const statusData = await statusResponse.json();

      if (statusData.status === 'completed' && statusData.data) {
        // Extract text from the response
        const extractedData = statusData.data;
        if (typeof extractedData === 'string') {
          return extractedData;
        }
        if (typeof extractedData === 'object' && extractedData.content) {
          return typeof extractedData.content === 'string'
            ? extractedData.content
            : JSON.stringify(extractedData.content);
        }
        return JSON.stringify(extractedData);
      }

      if (statusData.status === 'failed') {
        throw new Error('Firecrawl extraction failed');
      }

      if (statusData.status === 'cancelled') {
        throw new Error('Firecrawl extraction was cancelled');
      }
    }

    throw new Error('Firecrawl extraction timed out');
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to extract content from URL');
  }
}

/**
 * Extracts content from an attachment stored in S3
 */
async function extractContentFromAttachment(
  attachmentId: string,
  organizationId: string,
): Promise<{ content: string; fileType: string }> {
  const attachment = await db.attachment.findUnique({
    where: {
      id: attachmentId,
      organizationId,
    },
  });

  if (!attachment) {
    throw new Error('Attachment not found');
  }

  const bucketName = process.env.APP_AWS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('APP_AWS_BUCKET_NAME environment variable is not set in Trigger.dev.');
  }

  const key = extractS3KeyFromUrl(attachment.url);
  const s3Client = createS3Client();
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await s3Client.send(getCommand);

  if (!response.Body) {
    throw new Error('Failed to retrieve attachment from S3');
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const base64Data = buffer.toString('base64');

  // Determine file type from attachment or content type
  const fileType =
    response.ContentType || (attachment.type === 'image' ? 'image/png' : 'application/pdf');

  const content = await extractContentFromFile(base64Data, fileType);

  return { content, fileType };
}

/**
 * Creates an S3 client instance for Trigger.dev tasks
 * Reads environment variables directly (not from shared s3.ts module)
 */
function createS3Client(): S3Client {
  const region = process.env.APP_AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS S3 credentials are missing. Please set APP_AWS_ACCESS_KEY_ID and APP_AWS_SECRET_ACCESS_KEY environment variables in Trigger.dev.',
    );
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Extracts content from an S3 key (for temporary questionnaire files)
 */
async function extractContentFromS3Key(
  s3Key: string,
  fileType: string,
): Promise<{ content: string; fileType: string }> {
  const questionnaireBucket = process.env.APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET;

  if (!questionnaireBucket) {
    throw new Error(
      'Questionnaire upload bucket is not configured. Please set APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET environment variable in Trigger.dev.',
    );
  }

  const s3Client = createS3Client();

  const getCommand = new GetObjectCommand({
    Bucket: questionnaireBucket,
    Key: s3Key,
  });

  const response = await s3Client.send(getCommand);

  if (!response.Body) {
    throw new Error('Failed to retrieve file from S3');
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const base64Data = buffer.toString('base64');

  // Use provided fileType or determine from content type
  const detectedFileType = response.ContentType || fileType || 'application/octet-stream';

  const content = await extractContentFromFile(base64Data, detectedFileType);

  return { content, fileType: detectedFileType };
}

/**
 * Parses questions and answers from a single chunk of content
 */
async function parseChunkQuestionsAndAnswers(
  chunk: string,
  chunkIndex: number,
  totalChunks: number,
): Promise<QuestionAnswer[]> {
  const { object } = await generateObject({
    model: openai('gpt-5-mini'), // Fastest model for structured extraction (20-40% faster than GPT-4o-mini)
    mode: 'json',
    schema: jsonSchema({
      type: 'object',
      properties: {
        questionsAndAnswers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: 'The question text',
              },
              answer: {
                anyOf: [{ type: 'string' }, { type: 'null' }],
                description: 'The answer to the question. Use null if no answer is provided.',
              },
            },
            required: ['question'],
          },
        },
      },
      required: ['questionsAndAnswers'],
    }),
    system: `You parse vendor questionnaires. Return only genuine question text paired with its answer.
- Ignore table headers, column labels, metadata rows, or placeholder words such as "Question", "Company Name", "Department", "Assessment Date", "Name of Assessor".
- A valid question is a meaningful sentence (usually ends with '?' or starts with interrogatives like What/Why/How/When/Where/Is/Are/Do/Does/Can/Will/Should).
- Do not fabricate answers; if no answer is provided, set answer to null.
- Keep the original question wording but trim whitespace.`,
    prompt:
      totalChunks > 1
        ? `Chunk ${chunkIndex + 1} of ${totalChunks}.
Instructions:
- Extract only question → answer pairs that represent real questions.
- Ignore rows or cells that contain only headers/labels (e.g. "Company Name", "Department", "Assessment Date", "Question", "Answer") or other metadata.
- If an answer is blank, set it to null.

Chunk content:
${chunk}`
        : `Instructions:
- Extract all meaningful question → answer pairs from the following content.
- Ignore rows or cells that contain only headers/labels (e.g. "Company Name", "Department", "Assessment Date", "Question", "Answer", "Name of Assessor").
- Keep only entries that are actual questions (end with '?' or start with interrogative words).
- If an answer is blank, set it to null.

Content:
${chunk}`,
  });

  const parsed = (object as { questionsAndAnswers: QuestionAnswer[] }).questionsAndAnswers;

  // Post-process to ensure empty strings are converted to null
  return parsed.map((qa) => ({
    question: qa.question,
    answer: qa.answer && qa.answer.trim() !== '' ? qa.answer : null,
  }));
}

/**
 * Parses questions and answers from extracted content using LLM
 * Optimized to handle large content by chunking and processing in parallel
 */
async function parseQuestionsAndAnswers(content: string): Promise<QuestionAnswer[]> {
  // GPT-5-mini can handle ~128k tokens. Chunk by individual questions (1 question = 1 chunk) for parallel processing.
  const MAX_CHUNK_SIZE_CHARS = 80_000;
  const MIN_CHUNK_SIZE_CHARS = 5_000;
  const MAX_QUESTIONS_PER_CHUNK = 1; // Each chunk contains exactly one question

  const chunkInfos = buildQuestionAwareChunks(content, {
    maxChunkChars: MAX_CHUNK_SIZE_CHARS,
    minChunkChars: MIN_CHUNK_SIZE_CHARS,
    maxQuestionsPerChunk: MAX_QUESTIONS_PER_CHUNK,
  });

  if (chunkInfos.length === 0) {
    logger.warn('No content found after preprocessing, returning empty result');
    return [];
  }

  if (chunkInfos.length === 1) {
    logger.info('Processing content as a single chunk', {
      contentLength: chunkInfos[0].content.length,
      estimatedQuestions: chunkInfos[0].questionCount,
    });
    return parseChunkQuestionsAndAnswers(chunkInfos[0].content, 0, 1);
  }

  const totalEstimatedQuestions = chunkInfos.reduce((sum, chunk) => sum + chunk.questionCount, 0);

  logger.info('Chunking content by individual questions (1 question per chunk) for parallel processing', {
    contentLength: content.length,
    totalChunks: chunkInfos.length,
    questionsPerChunk: 1, // Each chunk contains exactly one question
  });

  // Process all chunks in parallel for maximum speed
  const parseStartTime = Date.now();
  const allPromises = chunkInfos.map((chunk, index) =>
    parseChunkQuestionsAndAnswers(chunk.content, index, chunkInfos.length),
  );

  const allResults = await Promise.all(allPromises);
  const parseTime = ((Date.now() - parseStartTime) / 1000).toFixed(2);

  const totalRawQuestions = allResults.reduce((sum, chunk) => sum + chunk.length, 0);

  logger.info('All chunks processed in parallel', {
    totalChunks: chunkInfos.length,
    parseTimeSeconds: parseTime,
    totalQuestions: totalRawQuestions,
  });

  // Deduplicate questions (same question might appear in multiple chunks)
  // Use Map for O(1) lookups and preserve order
  const seenQuestions = new Map<string, QuestionAnswer>();

  for (const qaArray of allResults) {
    for (const qa of qaArray) {
      const normalizedQuestion = qa.question.toLowerCase().trim();
      // Keep first occurrence (preserves order)
      if (!seenQuestions.has(normalizedQuestion)) {
        seenQuestions.set(normalizedQuestion, qa);
      }
    }
  }

  const uniqueResults = Array.from(seenQuestions.values());

  logger.info('Parsing complete', {
    totalQuestions: uniqueResults.length,
    duplicatesRemoved: totalRawQuestions - uniqueResults.length,
  });

  return uniqueResults;
}

interface ChunkInfo {
  content: string;
  questionCount: number;
}

function buildQuestionAwareChunks(
  content: string,
  options: {
    maxChunkChars: number;
    minChunkChars: number;
    maxQuestionsPerChunk: number;
  },
): ChunkInfo[] {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return [];
  }

  const chunks: ChunkInfo[] = [];
  const lines = trimmedContent.split(/\r?\n/);
  let currentChunk: string[] = [];
  let currentQuestionFound = false;

  const pushChunk = () => {
    const chunkText = currentChunk.join('\n').trim();
    if (!chunkText) {
      return;
    }
    chunks.push({
      content: chunkText,
      questionCount: 1, // Each chunk contains exactly one question
    });
    currentChunk = [];
    currentQuestionFound = false;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    const isEmpty = trimmedLine.length === 0;
    const looksLikeQuestion = !isEmpty && looksLikeQuestionLine(trimmedLine);

    // If we find a new question and we already have a question in the current chunk, start a new chunk
    if (looksLikeQuestion && currentQuestionFound && currentChunk.length > 0) {
      pushChunk();
    }

    // Add line to current chunk (including empty lines for context)
    if (!isEmpty || currentChunk.length > 0) {
      currentChunk.push(line);
    }

    // Mark that we've found a question in this chunk
    if (looksLikeQuestion) {
      currentQuestionFound = true;
    }
  }

  // Push the last chunk if it has content
  if (currentChunk.length > 0) {
    pushChunk();
  }

  // If no questions were detected, return the entire content as a single chunk
  return chunks.length > 0
    ? chunks
    : [
        {
          content: trimmedContent,
          questionCount: estimateQuestionCount(trimmedContent),
        },
      ];
}

function looksLikeQuestionLine(line: string): boolean {
  const questionSuffix = /[?？]\s*$/;
  const explicitQuestionPrefix = /^(?:\d+\s*[\).\]]\s*)?(?:question|q)\b/i;
  const interrogativePrefix =
    /^(?:what|why|how|when|where|is|are|does|do|can|will|should|list|describe|explain)\b/i;

  return (
    questionSuffix.test(line) || explicitQuestionPrefix.test(line) || interrogativePrefix.test(line)
  );
}

function estimateQuestionCount(text: string): number {
  const questionMarks = text.match(/[?？]/g)?.length ?? 0;
  if (questionMarks > 0) {
    return questionMarks;
  }
  const lines = text.split(/\r?\n/).filter((line) => looksLikeQuestionLine(line.trim()));
  if (lines.length > 0) {
    return lines.length;
  }
  // Fallback heuristic: assume roughly one question per 1200 chars
  return Math.max(1, Math.floor(text.length / 1200));
}

export const parseQuestionnaireTask = task({
  id: 'parse-questionnaire',
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: {
    inputType: 'file' | 'url' | 'attachment' | 's3';
    organizationId: string;
    // For file uploads
    fileData?: string; // base64 encoded
    fileName?: string;
    fileType?: string; // MIME type
    // For URLs
    url?: string;
    // For attachments
    attachmentId?: string;
    // For S3 keys (temporary questionnaire files)
    s3Key?: string;
  }) => {
    const taskStartTime = Date.now();

    logger.info('Starting parse questionnaire task', {
      inputType: payload.inputType,
      organizationId: payload.organizationId,
    });

    try {
      // Note: Sync is now done during answer generation for better performance
      // Parsing is fast and doesn't need embeddings

      let extractedContent: string;

      // Extract content based on input type
      switch (payload.inputType) {
        case 'file': {
          if (!payload.fileData || !payload.fileType) {
            throw new Error('File data and file type are required for file input');
          }
          extractedContent = await extractContentFromFile(payload.fileData, payload.fileType);
          break;
        }

        case 'url': {
          if (!payload.url) {
            throw new Error('URL is required for URL input');
          }
          extractedContent = await extractContentFromUrl(payload.url);
          break;
        }

        case 'attachment': {
          if (!payload.attachmentId) {
            throw new Error('Attachment ID is required for attachment input');
          }
          const result = await extractContentFromAttachment(
            payload.attachmentId,
            payload.organizationId,
          );
          extractedContent = result.content;
          break;
        }

        case 's3': {
          if (!payload.s3Key || !payload.fileType) {
            throw new Error('S3 key and file type are required for S3 input');
          }
          const result = await extractContentFromS3Key(payload.s3Key, payload.fileType);
          extractedContent = result.content;
          break;
        }

        default:
          throw new Error(`Unsupported input type: ${payload.inputType}`);
      }

      logger.info('Content extracted successfully', {
        inputType: payload.inputType,
        contentLength: extractedContent.length,
      });

      // Parse questions and answers from extracted content
      const parseStartTime = Date.now();
      const questionsAndAnswers = await parseQuestionsAndAnswers(extractedContent);
      const parseTime = ((Date.now() - parseStartTime) / 1000).toFixed(2);

      const totalTime = ((Date.now() - taskStartTime) / 1000).toFixed(2);

      logger.info('Questions and answers parsed', {
        questionCount: questionsAndAnswers.length,
        parseTimeSeconds: parseTime,
        totalTimeSeconds: totalTime,
      });

      // Create questionnaire record in database
      let questionnaireId: string;
      try {
        const fileName = payload.fileName || payload.url || payload.attachmentId || 'questionnaire';
        const s3Key = payload.s3Key || '';
        const fileType = payload.fileType || 'application/octet-stream';
        // For s3 input, we don't have fileData, so estimate size or use 0
        // The actual file size isn't critical for questionnaire records
        const fileSize = payload.fileData ? Buffer.from(payload.fileData, 'base64').length : 0;

        const questionnaire = await db.questionnaire.create({
          data: {
            filename: fileName,
            s3Key: s3Key || '',
            fileType,
            fileSize,
            organizationId: payload.organizationId,
            status: 'completed',
            parsedAt: new Date(),
            totalQuestions: questionsAndAnswers.length,
            answeredQuestions: 0,
            questions: {
              create: questionsAndAnswers.map((qa, index) => ({
                question: qa.question,
                answer: qa.answer || null,
                questionIndex: index,
                status: qa.answer ? 'generated' : 'untouched',
              })),
            },
          },
        });

        questionnaireId = questionnaire.id;

        logger.info('Questionnaire record created', {
          questionnaireId,
          questionCount: questionsAndAnswers.length,
        });
      } catch (error) {
        logger.error('Failed to create questionnaire record', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't fail parsing if DB creation fails - we can still return results
        // Frontend can handle saving later
        questionnaireId = '';
      }

      // NOTE: We no longer add questionnaire Q&A pairs to the vector database
      // They are not used as a source for generating answers (only Policy and Context are used)
      // This prevents cluttering the vector DB with potentially outdated questionnaire answers
      //
      // If you need to use questionnaire Q&A as a source in the future, uncomment this block:
      /*
      const vendorName = 'Security Questionnaire';
      const sourcePrefix = `org_${payload.organizationId}`;
      
      // Add parsed questionnaire Q&A pairs to vector database
      try {
        for (let i = 0; i < questionsAndAnswers.length; i++) {
          const qa = questionsAndAnswers[i];
          
          // Skip if no answer (we can't use empty answers as context)
          if (!qa.answer || qa.answer.trim().length === 0) {
            continue;
          }
          
          try {
            // Create text representation: "Question: X\n\nAnswer: Y"
            const qaText = `Question: ${qa.question}\n\nAnswer: ${qa.answer}`;
            
            // Chunk if needed (though Q&A pairs are usually short)
            const chunks = chunkText(qaText, 500, 50);
            
            for (let j = 0; j < chunks.length; j++) {
              const chunk = chunks[j];
              const embeddingId = `questionnaire_${sourcePrefix}_qa${i}_chunk${j}`;
              
              await upsertEmbedding(embeddingId, chunk, {
                organizationId: payload.organizationId,
                sourceType: 'questionnaire',
                sourceId: `${sourcePrefix}_qa${i}`,
                content: chunk,
                vendorName,
                questionnaireQuestion: qa.question,
              });
            }
          } catch (error) {
            logger.error('Failed to add Q&A to vector DB', {
              questionIndex: i,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            // Continue with other Q&A pairs even if one fails
          }
        }
      } catch (error) {
        logger.warn('Failed to add questionnaire to vector DB', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't fail parsing if vector DB addition fails
      }
      */

      return {
        success: true,
        questionnaireId,
        questionsAndAnswers,
        extractedContent: extractedContent.substring(0, 1000), // Return first 1000 chars for preview
      };
    } catch (error) {
      logger.error('Failed to parse questionnaire', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error instanceof Error ? error : new Error('Failed to parse questionnaire');
    }
  },
});
