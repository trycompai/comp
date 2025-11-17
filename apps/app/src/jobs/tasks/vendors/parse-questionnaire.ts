import { logger, task } from '@trigger.dev/sdk';
import { extractS3KeyFromUrl } from '@/app/s3';
import { env } from '@/env.mjs';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { openai } from '@ai-sdk/openai';
import { db } from '@db';
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
async function extractContentFromFile(
  fileData: string,
  fileType: string,
): Promise<string> {
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
              return row.filter((cell) => cell !== null && cell !== undefined && cell !== '').join(' | ');
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
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      throw new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Handle plain text files
  if (fileType === 'text/plain' || fileType.startsWith('text/')) {
    try {
      return fileBuffer.toString('utf-8');
    } catch (error) {
      throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      throw new Error(`Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        prompt: 'Extract all text content from this page, including any questions and answers, forms, or questionnaire data.',
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
    response.ContentType ||
    (attachment.type === 'image' ? 'image/png' : 'application/pdf');
  
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
    throw new Error('Questionnaire upload bucket is not configured. Please set APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET environment variable in Trigger.dev.');
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
async function parseChunkQuestionsAndAnswers(chunk: string, chunkIndex: number, totalChunks: number): Promise<QuestionAnswer[]> {
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
                anyOf: [
                  { type: 'string' },
                  { type: 'null' },
                ],
                description: 'The answer to the question. Use null if no answer is provided.',
              },
            },
            required: ['question'],
          },
        },
      },
      required: ['questionsAndAnswers'],
    }),
    system: `Extract question-answer pairs from vendor questionnaires. Return structured pairs. Use null for missing answers.`,
    prompt: totalChunks > 1
      ? `Extract question-answer pairs from chunk ${chunkIndex + 1} of ${totalChunks}:

${chunk}

Return all question-answer pairs found in this chunk.`
      : `Extract all question-answer pairs from:

${chunk}

Return a structured list of questions and their corresponding answers.`,
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
  // GPT-5-mini can handle ~128k tokens, chunk at 100k tokens for efficiency
  // 1 token ≈ 4 characters, so 100k tokens ≈ 400k characters
  const MAX_CHUNK_SIZE_CHARS = 400_000; // Increased for fewer API calls
  const MIN_CHUNK_SIZE_CHARS = 10_000; // Don't chunk if content is small
  
  // If content is small, process directly
  if (content.length <= MIN_CHUNK_SIZE_CHARS) {
    logger.info('Processing content directly (small size)', {
      contentLength: content.length,
    });
    return parseChunkQuestionsAndAnswers(content, 0, 1);
  }
  
  // Chunk large content
  logger.info('Chunking large content for parallel processing', {
    contentLength: content.length,
    estimatedChunks: Math.ceil(content.length / MAX_CHUNK_SIZE_CHARS),
  });
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < content.length) {
    const end = Math.min(start + MAX_CHUNK_SIZE_CHARS, content.length);
    let chunk = content.slice(start, end);
    
    // Try to break at smart boundaries for better context
    // Prefer breaking after question marks (preserves Q&A pairs)
    if (end < content.length && chunk.length > MAX_CHUNK_SIZE_CHARS * 0.8) {
      let breakPoint = -1;
      
      // First try: break after question mark (best for Q&A content)
      const lastQuestionMark = chunk.lastIndexOf('?');
      if (lastQuestionMark > MAX_CHUNK_SIZE_CHARS * 0.7) {
        // Find end of line after question mark
        const afterQuestion = chunk.indexOf('\n', lastQuestionMark);
        breakPoint = afterQuestion !== -1 ? afterQuestion + 1 : lastQuestionMark + 1;
      }
      
      // Fallback: break at paragraph boundaries
      if (breakPoint === -1) {
        const lastDoubleNewline = chunk.lastIndexOf('\n\n');
        const lastSingleNewline = chunk.lastIndexOf('\n');
        breakPoint = Math.max(lastDoubleNewline, lastSingleNewline);
      }
      
      if (breakPoint > MAX_CHUNK_SIZE_CHARS * 0.7) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }
    
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
    
    start = end;
  }
  
  logger.info('Content chunked, processing in parallel', {
    totalChunks: chunks.length,
  });
  
  // Process ALL chunks in parallel for maximum speed
  // GPT-5-mini has high rate limits and is faster, so we can process all at once
  const parseStartTime = Date.now();
  const allPromises = chunks.map((chunk, index) =>
    parseChunkQuestionsAndAnswers(chunk, index, chunks.length),
  );
  
  const allResults = await Promise.all(allPromises);
  const parseTime = ((Date.now() - parseStartTime) / 1000).toFixed(2);
  
  logger.info('All chunks processed in parallel', {
    totalChunks: chunks.length,
    parseTimeSeconds: parseTime,
    totalQuestions: allResults.flat().length,
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
    duplicatesRemoved: allResults.length - uniqueResults.length,
  });
  
  return uniqueResults;
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
          extractedContent = await extractContentFromFile(
            payload.fileData,
            payload.fileType,
          );
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
          const result = await extractContentFromS3Key(
            payload.s3Key,
            payload.fileType,
          );
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
        questionsAndAnswers,
        extractedContent: extractedContent.substring(0, 1000), // Return first 1000 chars for preview
      };
    } catch (error) {
      logger.error('Failed to parse questionnaire', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error instanceof Error
        ? error
        : new Error('Failed to parse questionnaire');
    }
  },
});

