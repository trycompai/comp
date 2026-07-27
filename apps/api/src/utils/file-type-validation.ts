import { BadRequestException } from '@nestjs/common';

const MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  'application/zip': [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
};

// PDFs are handled separately: the %PDF-<version> header is allowed within the
// first 1024 bytes (ISO 32000 §7.5.2 / Adobe's reader behaviour), not necessarily
// at byte 0. Some exporters/vendors prepend a BOM or whitespace, so a strict
// offset-0 magic-byte check rejects otherwise-valid PDFs.
const PDF_HEADER = Buffer.from('%PDF');
const PDF_HEADER_SEARCH_BYTES = 1024;

/**
 * RIFF-based formats need extra validation — RIFF is shared by WAV, AVI, WebP, etc.
 * WebP files are: RIFF (4 bytes) + file size (4 bytes) + WEBP (4 bytes at offset 8).
 */
const RIFF_HEADER = Buffer.from([0x52, 0x49, 0x46, 0x46]); // RIFF
const WEBP_MARKER = Buffer.from([0x57, 0x45, 0x42, 0x50]); // WEBP

function isValidWebP(fileBuffer: Buffer): boolean {
  if (fileBuffer.length < 12) return false;
  return (
    fileBuffer.subarray(0, 4).equals(RIFF_HEADER) &&
    fileBuffer.subarray(8, 12).equals(WEBP_MARKER)
  );
}

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
  /(?:href|src|action|formaction|xlink:href|content|poster|background|data)\s*=\s*["']?\s*javascript:/i,
  /(?:href|src|action|formaction|xlink:href|content|poster|background|data)\s*=\s*["']?\s*vbscript:/i,
  /\bon(?:click|load|error|mouseover|focus|blur|submit|change|input|keydown|keyup|mousedown|mouseup|dblclick|contextmenu|drag|drop|touchstart|touchend|pointerdown|pointerup|animationend|abort|beforeunload|unload)\s*=/i,
];

export function validateFileContent(
  fileBuffer: Buffer,
  declaredMimeType: string,
  fileName: string,
): void {
  const lowerMime = declaredMimeType.toLowerCase();

  // WebP needs special handling — RIFF prefix is shared with WAV, AVI, etc.
  if (lowerMime === 'image/webp') {
    if (!isValidWebP(fileBuffer)) {
      throw new BadRequestException(
        'The uploaded file is invalid or corrupted. Please try again with a valid file.',
      );
    }
    return;
  }

  // PDFs: accept the %PDF header anywhere in the first 1024 bytes (not just at
  // offset 0), so valid PDFs with a leading BOM/whitespace aren't rejected.
  if (lowerMime === 'application/pdf') {
    if (!fileBuffer.subarray(0, PDF_HEADER_SEARCH_BYTES).includes(PDF_HEADER)) {
      throw new BadRequestException(
        'The uploaded file is invalid or corrupted. Please try again with a valid file.',
      );
    }
    return;
  }

  // Check magic bytes for other known binary types
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
