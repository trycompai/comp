import { BadRequestException } from '@nestjs/common';

const MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  'image/webp': [Buffer.from('RIFF')],
  'application/pdf': [Buffer.from('%PDF')],
  'application/zip': [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
};

const DANGEROUS_CONTENT_PATTERNS = [
  /<script[\s>]/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /javascript:/i,
  /vbscript:/i,
  /on\w+\s*=/i,
];

export function validateFileContent(
  fileBuffer: Buffer,
  declaredMimeType: string,
  fileName: string,
): void {
  const lowerMime = declaredMimeType.toLowerCase();

  const expectedSignatures = MAGIC_BYTES[lowerMime];
  if (expectedSignatures) {
    const matchesSignature = expectedSignatures.some((sig) =>
      fileBuffer.subarray(0, sig.length).equals(sig),
    );
    if (!matchesSignature) {
      throw new BadRequestException(
        `File content does not match declared type '${declaredMimeType}'.`,
      );
    }
  }

  const headStr = fileBuffer.subarray(0, 8192).toString('utf-8');
  for (const pattern of DANGEROUS_CONTENT_PATTERNS) {
    if (pattern.test(headStr)) {
      throw new BadRequestException(
        `File '${fileName}' contains potentially dangerous content.`,
      );
    }
  }
}
