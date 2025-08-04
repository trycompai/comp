'use server';

import { BUCKET_NAME, s3Client } from '@/app/s3';
import { auth } from '@/utils/auth';
import { logger } from '@/utils/logger';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AttachmentEntityType, AttachmentType, db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

// Configuration constants
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const SIGNED_URL_EXPIRY = 900; // 15 minutes

// Allowed file types for security
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

function mapFileTypeToAttachmentType(fileType: string): AttachmentType {
  const type = fileType.split('/')[0];
  switch (type) {
    case 'image':
      return AttachmentType.image;
    case 'video':
      return AttachmentType.video;
    case 'audio':
      return AttachmentType.audio;
    case 'application':
      return AttachmentType.document;
    default:
      return AttachmentType.other;
  }
}

// Enhanced validation schema
const uploadAttachmentSchema = z.object({
  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name is too long')
    .refine((name) => name.trim().length > 0, 'File name cannot be empty')
    .refine((name) => !/[<>:"/\\|?*]/.test(name), 'File name contains invalid characters'),
  fileType: z
    .string()
    .min(1, 'File type is required')
    .refine(
      (type) => ALLOWED_FILE_TYPES.includes(type),
      `File type not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`,
    ),
  fileData: z
    .string()
    .min(1, 'File data is required')
    .refine((data) => {
      try {
        // Basic base64 validation
        return /^[A-Za-z0-9+/]*={0,2}$/.test(data);
      } catch {
        return false;
      }
    }, 'Invalid file data format'),
  entityId: z
    .string()
    .min(1, 'Entity ID is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid entity ID format'),
  entityType: z.nativeEnum(AttachmentEntityType),
  pathToRevalidate: z.string().optional(),
});

// Custom error types for better error handling
class FileUploadError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'FileUploadError';
  }
}

// Helper function to generate secure file key
function generateFileKey(
  organizationId: string,
  entityType: AttachmentEntityType,
  entityId: string,
  fileName: string,
): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const sanitizedFileName = fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');

  return `${organizationId}/attachments/${entityType}/${entityId}/${timestamp}-${randomId}-${sanitizedFileName}`;
}

export const uploadFile = async (input: z.infer<typeof uploadAttachmentSchema>) => {
  // Parse and validate input first - validation errors will be thrown automatically
  const parsedInput = uploadAttachmentSchema.parse(input) as {
    fileName: string;
    fileType: string;
    fileData: string;
    entityId: string;
    entityType: AttachmentEntityType;
    pathToRevalidate?: string;
  };

  // Pre-flight checks
  if (!s3Client) {
    logger.error('[uploadFile] S3 client not initialized');
    throw new FileUploadError(
      'File upload service is currently unavailable. Please contact support.',
      'S3_CLIENT_UNAVAILABLE',
    );
  }

  if (!BUCKET_NAME) {
    logger.error('[uploadFile] S3 bucket name not configured');
    throw new FileUploadError(
      'File upload service is not properly configured.',
      'S3_BUCKET_NOT_CONFIGURED',
    );
  }

  // Authentication check
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    logger.error('[uploadFile] Not authorized - no organization found');
    throw new FileUploadError('Not authorized - no organization found', 'UNAUTHORIZED');
  }

  logger.info(`[uploadFile] Starting upload for ${parsedInput.fileName} in org ${organizationId}`);

  let s3Key: string | null = null;

  try {
    // Convert and validate file data
    const fileBuffer = Buffer.from(parsedInput.fileData, 'base64');

    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      logger.warn(`[uploadFile] File size ${fileBuffer.length} exceeds limit`);
      throw new FileUploadError(`File exceeds the ${MAX_FILE_SIZE_MB}MB limit.`, 'FILE_TOO_LARGE');
    }

    // Validate actual file size vs base64 size (base64 is ~33% larger)
    const actualFileSize = Math.floor(fileBuffer.length * 0.75);
    if (actualFileSize > MAX_FILE_SIZE_BYTES) {
      throw new FileUploadError(`File exceeds the ${MAX_FILE_SIZE_MB}MB limit.`, 'FILE_TOO_LARGE');
    }

    // Generate secure file key
    s3Key = generateFileKey(
      organizationId,
      parsedInput.entityType,
      parsedInput.entityId,
      parsedInput.fileName,
    );

    // Upload to S3
    logger.info(`[uploadFile] Uploading to S3 with key: ${s3Key}`);
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: parsedInput.fileType,
      Metadata: {
        originalFileName: parsedInput.fileName,
        entityId: parsedInput.entityId,
        entityType: parsedInput.entityType,
        organizationId: organizationId,
      },
    });

    await s3Client.send(putCommand);
    logger.info(`[uploadFile] S3 upload successful for key: ${s3Key}`);

    // Create database record
    logger.info(`[uploadFile] Creating attachment record in DB for key: ${s3Key}`);
    const attachment = await db.attachment.create({
      data: {
        name: parsedInput.fileName,
        url: s3Key,
        type: mapFileTypeToAttachmentType(parsedInput.fileType),
        entityId: parsedInput.entityId,
        entityType: parsedInput.entityType,
        organizationId: organizationId,
      },
    });

    // Generate signed URL
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });
    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: SIGNED_URL_EXPIRY,
    });

    // Revalidate path if provided
    if (parsedInput.pathToRevalidate) {
      revalidatePath(parsedInput.pathToRevalidate);
    }

    logger.info(`[uploadFile] Upload completed successfully for ${parsedInput.fileName}`);

    return {
      success: true,
      data: {
        ...attachment,
        signedUrl,
      },
    } as const;
  } catch (error) {
    // Cleanup: If S3 upload succeeded but DB operation failed, clean up S3 object
    if (s3Key && error instanceof Error && !error.message.includes('S3')) {
      try {
        logger.warn(`[uploadFile] Cleaning up S3 object after DB failure: ${s3Key}`);
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
          }),
        );
      } catch (cleanupError) {
        logger.error(`[uploadFile] Failed to cleanup S3 object: ${s3Key}`, cleanupError);
      }
    }

    // Enhanced error handling
    if (error instanceof FileUploadError) {
      logger.error(`[uploadFile] Upload failed: ${error.code} - ${error.message}`);
      return {
        success: false,
        error: error.message,
        code: error.code,
      } as const;
    }

    logger.error(`[uploadFile] Unexpected error during upload:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred.',
      code: 'UNKNOWN_ERROR',
    } as const;
  }
};
