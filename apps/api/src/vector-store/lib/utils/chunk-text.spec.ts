import { chunkText } from './chunk-text';

describe('chunkText', () => {
  it('preserves text after shortening a chunk at a sentence boundary', () => {
    const prefix = 'a'.repeat(1500) + '.';
    const content = prefix + 'b'.repeat(250) + 'MISSING_TEXT' + 'c'.repeat(500);
    const chunks = chunkText(content, 500, 50);

    expect(chunks[0]).toBe(prefix);
    expect(chunks[1]).toBe(content.slice(prefix.length - 200));
    expect(chunks.some((chunk) => chunk.includes('MISSING_TEXT'))).toBe(true);
  });

  it('preserves text after shortening a chunk at a newline', () => {
    const content = 'a'.repeat(31) + '\n' + 'MISSING' + 'b'.repeat(30);
    const chunks = chunkText(content, 10, 0);

    expect(chunks).toEqual(['a'.repeat(31), 'MISSING' + 'b'.repeat(30)]);
  });

  it('stops once the final chunk reaches the document end', () => {
    const content = 'a'.repeat(40) + 'b'.repeat(20);

    expect(chunkText(content, 10, 2)).toEqual([
      'a'.repeat(40),
      'a'.repeat(8) + 'b'.repeat(20),
    ]);
  });

  it.each([0, 2, 8, 9])(
    'covers the entire input with %i tokens of overlap',
    (overlapTokens) => {
      // Distinct characters let us locate each chunk unambiguously in the source.
      const characters = Array.from({ length: 640 }, (_, index) => {
        if (index % 64 === 63) return '\n';
        if (index % 32 === 31) return '.';
        return String.fromCharCode(0x100 + index);
      });
      const content = characters.join('');
      const chunks = chunkText(content, 10, overlapTokens);
      let coveredEnd = 0;
      let previousStart = 0;

      for (const chunk of chunks) {
        const start = content.indexOf(chunk, previousStart);
        expect(start).toBeGreaterThanOrEqual(previousStart);
        // A gap before the next chunk would omit source text from embeddings.
        expect(content.slice(coveredEnd, start).trim()).toBe('');
        expect(chunk.length).toBeLessThanOrEqual(40);
        coveredEnd = Math.max(coveredEnd, start + chunk.length);
        previousStart = start;
      }

      expect(content.slice(coveredEnd).trim()).toBe('');
      expect(chunks.length).toBeLessThanOrEqual(content.length);
    },
  );

  it('keeps the existing empty and short input behavior', () => {
    expect(chunkText(' \n ')).toEqual([]);
    expect(chunkText('  short document  ')).toEqual(['short document']);
  });

  it.each([
    { chunkSize: 0, overlap: 0 },
    { chunkSize: 10, overlap: -1 },
    { chunkSize: 10, overlap: 10 },
  ])('rejects invalid sizes: %j', ({ chunkSize, overlap }) => {
    expect(() => chunkText('document', chunkSize, overlap)).toThrow(
      'Invalid chunk parameters',
    );
  });
});
