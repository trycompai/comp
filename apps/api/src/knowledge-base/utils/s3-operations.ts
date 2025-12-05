import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import { s3Client, APP_AWS_KNOWLEDGE_BASE_BUCKET } from '@/app/s3';
import {
  MAX_FILE_SIZE_BYTES,
  SIGNED_URL_EXPIRATION_SECONDS,
  sanitizeFileName,
  sanitizeMetadataFileName,
  generateS3Key,
} from './constants';

export interface UploadResult {
  s3Key: string;
  fileSize: number;
}

export interface SignedUrlResult {
  signedUrl: string;
}

/**
 * Validates that S3 is configured
 */
export function validateS3Config(): void {
  if (!s3Client) {
    throw new Error('S3 client not configured');
  }

  if (!APP_AWS_KNOWLEDGE_BASE_BUCKET) {
    throw new Error(
      'Knowledge base bucket is not configured. Please set APP_AWS_KNOWLEDGE_BASE_BUCKET environment variable.',
    );
  }
}

/**
 * Uploads a document to S3
 */
export async function uploadToS3(
  organizationId: string,
  fileName: string,
  fileType: string,
  fileData: string,
): Promise<UploadResult> {
  validateS3Config();

  // Convert base64 to buffer
  const fileBuffer = Buffer.from(fileData, 'base64');

  // Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
    );
  }

  // Generate unique file key
  const fileId = randomBytes(16).toString('hex');
  const sanitized = sanitizeFileName(fileName);
  const s3Key = generateS3Key(organizationId, fileId, sanitized);

  // Upload to S3
  const putCommand = new PutObjectCommand({
    Bucket: APP_AWS_KNOWLEDGE_BASE_BUCKET!,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: fileType,
    Metadata: {
      originalFileName: sanitizeMetadataFileName(fileName),
      organizationId,
    },
  });

  await s3Client!.send(putCommand);

  return {
    s3Key,
    fileSize: fileBuffer.length,
  };
}

/**
 * Generates a signed URL for downloading a document
 */
export async function generateDownloadUrl(
  s3Key: string,
  fileName: string,
): Promise<SignedUrlResult> {
  validateS3Config();

  const command = new GetObjectCommand({
    Bucket: APP_AWS_KNOWLEDGE_BASE_BUCKET!,
    Key: s3Key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
  });

  const signedUrl = await getSignedUrl(s3Client!, command, {
    expiresIn: SIGNED_URL_EXPIRATION_SECONDS,
  });

  return { signedUrl };
}

/**
 * Generates a signed URL for viewing a document in browser
 */
export async function generateViewUrl(
  s3Key: string,
  fileName: string,
  fileType: string,
): Promise<SignedUrlResult> {
  validateS3Config();

  const command = new GetObjectCommand({
    Bucket: APP_AWS_KNOWLEDGE_BASE_BUCKET!,
    Key: s3Key,
    ResponseContentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`,
    ResponseContentType: fileType || 'application/octet-stream',
  });

  const signedUrl = await getSignedUrl(s3Client!, command, {
    expiresIn: SIGNED_URL_EXPIRATION_SECONDS,
  });

  return { signedUrl };
}

/**
 * Deletes a document from S3
 * Returns true if successful, false if error (non-throwing)
 */
export async function deleteFromS3(s3Key: string): Promise<boolean> {
  try {
    validateS3Config();

    const deleteCommand = new DeleteObjectCommand({
      Bucket: APP_AWS_KNOWLEDGE_BASE_BUCKET!,
      Key: s3Key,
    });

    await s3Client!.send(deleteCommand);
    return true;
  } catch {
    return false;
  }
}
