import { BadRequestException } from '@nestjs/common';

const MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  'image/webp': [Buffer.from('RIFF')],
  'application/pdf': [Buffer.from('%PDF')],
  'application/zip': [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
};

/** MIME types that are verified binary — skip text pattern scanning for these. */
const BINARY_MIME_TYPES = new Set(Object.keys(MAGIC_BYTES));

/**
 * Patterns that indicate potentially dangerous HTML/script content.
 * Only applied to text-based files (not binary files that passed magic byte check).
 * Uses specific event handler names to avoid false positives on words like "online".
 */
const DANGEROUS_CONTENT_PATTERNS = [
  /<script[\s>]/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /javascript:/i,
  /vbscript:/i,
  /\bon(?:click|load|error|mouseover|focus|blur|submit|change|input|keydown|keyup|mousedown|mouseup|dblclick|contextmenu|drag|drop|touchstart|touchend|pointerdown|pointerup|animationend|abort|beforeunload|unload)\s*=/i,
];

export function validateFileContent(
  fileBuffer: Buffer,
  declaredMimeType: string,
  fileName: string,
): void {
  const lowerMime = declaredMimeType.toLowerCase();

  // Check magic bytes for known binary types
  const expectedSignatures = MAGIC_BYTES[lowerMime];
  if (expectedSignatures) {
    const matchesSignature = expectedSignatures.some((sig) =>
      fileBuffer.subarray(0, sig.length).equals(sig),
    );
    if (!matchesSignature) {
      throw new BadRequestException(
        'The uploaded file is invalid or corrupted. Please try again with a valid file.',
      );
    }
    // Binary file passed magic byte check — skip text pattern scanning
    // to avoid false positives from binary data matching text patterns
    return;
  }

  // For non-binary files: scan first 8KB for dangerous HTML/script content
  const headStr = fileBuffer.subarray(0, 8192).toString('utf-8');
  for (const pattern of DANGEROUS_CONTENT_PATTERNS) {
    if (pattern.test(headStr)) {
      throw new BadRequestException(
        'The uploaded file is invalid or corrupted. Please try again with a valid file.',
      );
    }
  }
}
