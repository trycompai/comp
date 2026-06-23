import { BadRequestException } from '@nestjs/common';
import { validateFileContent } from './file-type-validation';

describe('validateFileContent', () => {
  it('should accept a valid PNG file', () => {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    expect(() =>
      validateFileContent(pngBuffer, 'image/png', 'test.png'),
    ).not.toThrow();
  });

  it('should accept a valid PDF file', () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 some content');
    expect(() =>
      validateFileContent(pdfBuffer, 'application/pdf', 'test.pdf'),
    ).not.toThrow();
  });

  it('should accept a PDF with a leading BOM/whitespace before %PDF', () => {
    // Some exporters/vendors (e.g. GoodHire) prepend a UTF-8 BOM or whitespace;
    // the %PDF header is still within the first 1024 bytes, so it must be accepted.
    const pdfBuffer = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]), // UTF-8 BOM
      Buffer.from('\n  %PDF-1.7 rest of document'),
    ]);
    expect(() =>
      validateFileContent(pdfBuffer, 'application/pdf', 'report.pdf'),
    ).not.toThrow();
  });

  it('should reject a file declared as PDF with no %PDF header', () => {
    const notPdf = Buffer.from('this is plainly not a pdf at all');
    expect(() =>
      validateFileContent(notPdf, 'application/pdf', 'fake.pdf'),
    ).toThrow();
  });

  it('should accept a valid JPEG file', () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(() =>
      validateFileContent(jpegBuffer, 'image/jpeg', 'test.jpg'),
    ).not.toThrow();
  });

  it('should reject HTML content disguised as PNG', () => {
    const htmlBuffer = Buffer.from('<script>alert("xss")</script>');
    expect(() =>
      validateFileContent(htmlBuffer, 'image/png', 'test.png'),
    ).toThrow(BadRequestException);
  });

  it('should reject PNG with wrong magic bytes', () => {
    const fakeBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    expect(() =>
      validateFileContent(fakeBuffer, 'image/png', 'test.png'),
    ).toThrow(BadRequestException);
  });

  it('should reject files containing script tags regardless of type', () => {
    const malicious = Buffer.from(
      '<html><script>document.cookie</script></html>',
    );
    expect(() =>
      validateFileContent(malicious, 'text/plain', 'readme.txt'),
    ).toThrow(BadRequestException);
  });

  it('should reject files with event handlers', () => {
    const malicious = Buffer.from('<img src=x onerror=alert(1)>');
    expect(() =>
      validateFileContent(malicious, 'text/plain', 'readme.txt'),
    ).toThrow(BadRequestException);
  });

  it('should allow text files that are actually text', () => {
    const textBuffer = Buffer.from('Hello, this is a normal text file.');
    expect(() =>
      validateFileContent(textBuffer, 'text/plain', 'readme.txt'),
    ).not.toThrow();
  });

  it('should allow unknown MIME types without magic byte check', () => {
    const csvBuffer = Buffer.from('name,email\njohn,john@example.com');
    expect(() =>
      validateFileContent(csvBuffer, 'text/csv', 'data.csv'),
    ).not.toThrow();
  });

  it('should accept a valid WebP file', () => {
    // WebP: RIFF (4 bytes) + size (4 bytes) + WEBP (4 bytes)
    const webpBuffer = Buffer.alloc(16);
    webpBuffer.write('RIFF', 0);
    webpBuffer.writeUInt32LE(8, 4);
    webpBuffer.write('WEBP', 8);
    expect(() =>
      validateFileContent(webpBuffer, 'image/webp', 'photo.webp'),
    ).not.toThrow();
  });

  it('should reject a WAV file disguised as WebP', () => {
    // WAV also starts with RIFF but has WAVE at offset 8, not WEBP
    const wavBuffer = Buffer.alloc(16);
    wavBuffer.write('RIFF', 0);
    wavBuffer.writeUInt32LE(8, 4);
    wavBuffer.write('WAVE', 8);
    expect(() =>
      validateFileContent(wavBuffer, 'image/webp', 'fake.webp'),
    ).toThrow(BadRequestException);
  });

  it('should allow prose mentioning "JavaScript:" in text content', () => {
    const jsonBuffer = Buffer.from(
      '{"summary":"JavaScript: zod; Python: pydantic"}',
    );
    expect(() =>
      validateFileContent(jsonBuffer, 'application/json', 'report.json'),
    ).not.toThrow();
  });

  it('should still reject javascript: URL schemes', () => {
    const malicious = Buffer.from('<a href="javascript:alert(1)">x</a>');
    expect(() =>
      validateFileContent(malicious, 'text/html', 'evil.html'),
    ).toThrow(BadRequestException);
  });

  it('should still reject vbscript: URL schemes', () => {
    const malicious = Buffer.from('<a href="vbscript:msgbox(1)">x</a>');
    expect(() =>
      validateFileContent(malicious, 'text/html', 'evil.html'),
    ).toThrow(BadRequestException);
  });

  it('should reject javascript: URLs with whitespace after the colon', () => {
    const malicious = Buffer.from('<a href="javascript: alert(1)">x</a>');
    expect(() =>
      validateFileContent(malicious, 'text/html', 'evil.html'),
    ).toThrow(BadRequestException);
  });

  it('should reject javascript: in single-quoted attributes', () => {
    const malicious = Buffer.from("<a href='javascript:alert(1)'>x</a>");
    expect(() =>
      validateFileContent(malicious, 'text/html', 'evil.html'),
    ).toThrow(BadRequestException);
  });

  it('should reject javascript: in svg xlink:href', () => {
    const malicious = Buffer.from(
      '<svg><a xlink:href="javascript:alert(1)">x</a></svg>',
    );
    expect(() =>
      validateFileContent(malicious, 'image/svg+xml', 'evil.svg'),
    ).toThrow(BadRequestException);
  });

  it('should allow prose mentioning "javascript:" outside attribute context', () => {
    const docs = Buffer.from('See the javascript: URL scheme documentation.');
    expect(() =>
      validateFileContent(docs, 'text/plain', 'notes.txt'),
    ).not.toThrow();
  });

  it('should reject a RIFF file with script content disguised as WebP', () => {
    const malicious = Buffer.alloc(64);
    malicious.write('RIFF', 0);
    malicious.writeUInt32LE(56, 4);
    malicious.write('AVI ', 8); // Not WEBP
    expect(() =>
      validateFileContent(malicious, 'image/webp', 'evil.webp'),
    ).toThrow(BadRequestException);
  });
});
