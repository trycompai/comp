/**
 * Knowledge Base module constants
 */

// File size limits
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Signed URL expiration
export const SIGNED_URL_EXPIRATION_SECONDS = 3600; // 1 hour

// MIME types that can be viewed inline in browser
export const VIEWABLE_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'text/plain',
  'text/html',
  'text/csv',
  'text/markdown',
];

/**
 * Checks if a file type can be viewed inline in browser
 */
export function isViewableInBrowser(fileType: string): boolean {
  return VIEWABLE_MIME_TYPES.includes(fileType);
}

/**
 * Sanitizes a filename for safe use in S3 keys
 */
export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * Sanitizes a filename for use in S3 metadata (ASCII only)
 */
export function sanitizeMetadataFileName(fileName: string): string {
  return Buffer.from(fileName, 'utf8')
    .toString('ascii')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\?/g, '_')
    .trim()
    .substring(0, 1024);
}

/**
 * Generates a unique S3 key for a knowledge base document
 */
export function generateS3Key(
  organizationId: string,
  fileId: string,
  sanitizedFileName: string,
): string {
  const timestamp = Date.now();
  return `${organizationId}/knowledge-base-documents/${timestamp}-${fileId}-${sanitizedFileName}`;
}
