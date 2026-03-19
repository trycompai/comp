import { BadRequestException } from '@nestjs/common';
import { validateFileContent } from './file-type-validation';

describe('validateFileContent', () => {
  it('should accept a valid PNG file', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => validateFileContent(pngBuffer, 'image/png', 'test.png')).not.toThrow();
  });

  it('should accept a valid PDF file', () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 some content');
    expect(() => validateFileContent(pdfBuffer, 'application/pdf', 'test.pdf')).not.toThrow();
  });

  it('should accept a valid JPEG file', () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(() => validateFileContent(jpegBuffer, 'image/jpeg', 'test.jpg')).not.toThrow();
  });

  it('should reject HTML content disguised as PNG', () => {
    const htmlBuffer = Buffer.from('<script>alert("xss")</script>');
    expect(() => validateFileContent(htmlBuffer, 'image/png', 'test.png')).toThrow(BadRequestException);
  });

  it('should reject PNG with wrong magic bytes', () => {
    const fakeBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    expect(() => validateFileContent(fakeBuffer, 'image/png', 'test.png')).toThrow(BadRequestException);
  });

  it('should reject files containing script tags regardless of type', () => {
    const malicious = Buffer.from('<html><script>document.cookie</script></html>');
    expect(() => validateFileContent(malicious, 'text/plain', 'readme.txt')).toThrow(BadRequestException);
  });

  it('should reject files with event handlers', () => {
    const malicious = Buffer.from('<img src=x onerror=alert(1)>');
    expect(() => validateFileContent(malicious, 'text/plain', 'readme.txt')).toThrow(BadRequestException);
  });

  it('should allow text files that are actually text', () => {
    const textBuffer = Buffer.from('Hello, this is a normal text file.');
    expect(() => validateFileContent(textBuffer, 'text/plain', 'readme.txt')).not.toThrow();
  });

  it('should allow unknown MIME types without magic byte check', () => {
    const csvBuffer = Buffer.from('name,email\njohn,john@example.com');
    expect(() => validateFileContent(csvBuffer, 'text/csv', 'data.csv')).not.toThrow();
  });
});
