/**
 * Splits text into chunks of approximately the specified token size
 * Uses a simple approximation: 1 token ≈ 4 characters
 * @param text - The text to chunk
 * @param chunkSizeTokens - Target size in tokens (default: 500)
 * @param overlapTokens - Number of tokens to overlap between chunks (default: 50)
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  chunkSizeTokens: number = 500,
  overlapTokens: number = 50,
): string[] {
  // Validate inputs
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return [];
  }

  if (chunkSizeTokens <= 0 || overlapTokens < 0) {
    throw new Error(
      'Invalid chunk parameters: chunkSizeTokens must be > 0, overlapTokens must be >= 0',
    );
  }

  if (overlapTokens >= chunkSizeTokens) {
    throw new Error(
      'Invalid chunk parameters: overlapTokens must be less than chunkSizeTokens',
    );
  }

  // Simple approximation: 1 token ≈ 4 characters
  const chunkSizeChars = Math.max(1, Math.floor(chunkSizeTokens * 4));
  const overlapChars = Math.max(0, Math.floor(overlapTokens * 4));

  if (text.length <= chunkSizeChars) {
    return [text.trim()].filter((chunk) => chunk.length > 0);
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSizeChars, text.length);

    if (end <= start) {
      break; // Prevent infinite loop
    }

    let chunk = text.slice(start, end);

    // Try to break at sentence boundaries if possible
    if (end < text.length && chunk.length > chunkSizeChars * 0.7) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > chunkSizeChars * 0.7) {
        // Only break at sentence if we're at least 70% through the chunk
        end = start + breakPoint + 1;
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }

    const trimmedChunk = chunk.trim();
    if (trimmedChunk.length > 0) {
      chunks.push(trimmedChunk);
    }

    // The final chunk already contains the suffix; overlapping it again would
    // create redundant embeddings of progressively shorter tails.
    if (end === text.length) break;

    // Advance from the actual sentence boundary so no source text is skipped.
    // Strict forward progress also bounds the loop when overlap exceeds a
    // shortened chunk's length, without an iteration cap that can truncate it.
    const nextStart = end - overlapChars;
    if (nextStart <= start) {
      // Prevent infinite loop - move forward at least 1 character
      start = start + 1;
    } else {
      start = nextStart;
    }
  }

  return chunks.filter((chunk) => chunk.length > 0);
}
