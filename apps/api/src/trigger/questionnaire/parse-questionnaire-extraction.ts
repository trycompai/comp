import { extractS3KeyFromUrl } from '@/app/s3';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { db } from '@db';
import { logger } from '@trigger.dev/sdk';

// Import shared utilities
import {
  extractContentFromFile,
  type ContentExtractionLogger,
} from '@/questionnaire/utils/content-extractor';

// Adapter to convert Trigger.dev logger to ContentExtractionLogger interface
export const triggerLogger: ContentExtractionLogger = {
  info: (msg, meta) => logger.info(msg, meta),
  warn: (msg, meta) => logger.warn(msg, meta),
  error: (msg, meta) => logger.error(msg, meta),
};

/**
 * Extracts content from a URL using Firecrawl
 */
export async function extractContentFromUrl(url: string): Promise<string> {
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
export async function extractContentFromAttachment({
  attachmentId,
  organizationId,
}: {
  attachmentId: string;
  organizationId: string;
}): Promise<{ content: string; fileType: string }> {
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

  const buffer = Buffer.from(await response.Body.transformToByteArray());
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
export async function extractContentFromS3Key({
  s3Key,
  fileType,
}: {
  s3Key: string;
  fileType: string;
}): Promise<{ content: string; fileType: string }> {
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

  const buffer = Buffer.from(await response.Body.transformToByteArray());
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
