import { extractS3KeyFromUrl } from '@/app/s3';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk';

// Import shared utilities
import {
  extractContentFromFile,
  type ContentExtractionLogger,
} from '@/questionnaire/utils/content-extractor';
import {
  parseQuestionsAndAnswers,
  type QuestionAnswer,
} from '@/questionnaire/utils/question-parser';

// Adapter to convert Trigger.dev logger to ContentExtractionLogger interface
const triggerLogger: ContentExtractionLogger = {
  info: (msg, meta) => logger.info(msg, meta),
  warn: (msg, meta) => logger.warn(msg, meta),
  error: (msg, meta) => logger.error(msg, meta),
};

/**
 * Extracts content from a URL using Firecrawl
 */
async function extractContentFromUrl(url: string): Promise<string> {
  if (!process.env.FIRECRAWL_API_KEY) {
    throw new Error('Firecrawl API key is not configured');
  }

  try {
    const initialResponse = await fetch(
      'https://api.firecrawl.dev/v1/extract',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
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
      },
    );

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

      const statusResponse = await fetch(
        `https://api.firecrawl.dev/v1/extract/${jobId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          },
        },
      );

      const statusData = await statusResponse.json();

      if (statusData.status === 'completed' && statusData.data) {
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
    throw error instanceof Error
      ? error
      : new Error('Failed to extract content from URL');
  }
}

/**
 * Creates an S3 client instance for Trigger.dev tasks
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
    throw new Error(
      'APP_AWS_BUCKET_NAME environment variable is not set in Trigger.dev.',
    );
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

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const base64Data = buffer.toString('base64');

  const fileType =
    response.ContentType ||
    (attachment.type === 'image' ? 'image/png' : 'application/pdf');

  const content = await extractContentFromFile(
    base64Data,
    fileType,
    triggerLogger,
  );

  return { content, fileType };
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

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const base64Data = buffer.toString('base64');

  const detectedFileType =
    response.ContentType || fileType || 'application/octet-stream';

  const content = await extractContentFromFile(
    base64Data,
    detectedFileType,
    triggerLogger,
  );

  return { content, fileType: detectedFileType };
}

export const parseQuestionnaireTask = task({
  id: 'parse-questionnaire',
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: {
    inputType: 'file' | 'url' | 'attachment' | 's3';
    organizationId: string;
    fileData?: string;
    fileName?: string;
    fileType?: string;
    url?: string;
    attachmentId?: string;
    s3Key?: string;
  }) => {
    const taskStartTime = Date.now();

    logger.info('Starting parse questionnaire task', {
      inputType: payload.inputType,
      organizationId: payload.organizationId,
    });

    try {
      let extractedContent: string;

      // Extract content based on input type
      switch (payload.inputType) {
        case 'file': {
          if (!payload.fileData || !payload.fileType) {
            throw new Error(
              'File data and file type are required for file input',
            );
          }
          extractedContent = await extractContentFromFile(
            payload.fileData,
            payload.fileType,
            triggerLogger,
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
      const questionsAndAnswers = await parseQuestionsAndAnswers(
        extractedContent,
        triggerLogger,
      );
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
        const fileName =
          payload.fileName ||
          payload.url ||
          payload.attachmentId ||
          'questionnaire';
        const s3Key = payload.s3Key || '';
        const fileType = payload.fileType || 'application/octet-stream';
        const fileSize = payload.fileData
          ? Buffer.from(payload.fileData, 'base64').length
          : 0;

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
              create: questionsAndAnswers.map(
                (qa: QuestionAnswer, index: number) => ({
                  question: qa.question,
                  answer: qa.answer || null,
                  questionIndex: index,
                  status: qa.answer ? 'generated' : 'untouched',
                }),
              ),
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
        questionnaireId = '';
      }

      return {
        success: true,
        questionnaireId,
        questionsAndAnswers,
        extractedContent: extractedContent.substring(0, 1000),
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
