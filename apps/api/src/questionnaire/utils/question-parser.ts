import { openai } from '@ai-sdk/openai';
import { generateObject, jsonSchema } from 'ai';
import {
  MAX_CHUNK_SIZE_CHARS,
  MIN_CHUNK_SIZE_CHARS,
  MAX_QUESTIONS_PER_CHUNK,
  PARSING_MODEL,
  QUESTION_PARSING_SYSTEM_PROMPT,
} from './constants';

export interface QuestionAnswer {
  question: string;
  answer: string | null;
}

export interface ChunkInfo {
  content: string;
  questionCount: number;
}

export interface QuestionParserLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

// Default no-op logger
const defaultLogger: QuestionParserLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Parses questions and answers from extracted content using LLM
 * Handles large content by chunking and processing in parallel
 */
export async function parseQuestionsAndAnswers(
  content: string,
  logger: QuestionParserLogger = defaultLogger,
): Promise<QuestionAnswer[]> {
  const chunkInfos = buildQuestionAwareChunks(content, {
    maxChunkChars: MAX_CHUNK_SIZE_CHARS,
    minChunkChars: MIN_CHUNK_SIZE_CHARS,
    maxQuestionsPerChunk: MAX_QUESTIONS_PER_CHUNK,
  });

  if (chunkInfos.length === 0) {
    logger.warn('No content found after preprocessing, returning empty result');
    return [];
  }

  if (chunkInfos.length === 1) {
    logger.info('Processing content as a single chunk', {
      contentLength: chunkInfos[0].content.length,
      estimatedQuestions: chunkInfos[0].questionCount,
    });
    return parseChunkQuestionsAndAnswers(chunkInfos[0].content, 0, 1);
  }

  logger.info(
    'Chunking content by individual questions for parallel processing',
    {
      contentLength: content.length,
      totalChunks: chunkInfos.length,
      questionsPerChunk: 1,
    },
  );

  // Process all chunks in parallel for maximum speed
  const parseStartTime = Date.now();
  const allPromises = chunkInfos.map((chunk, index) =>
    parseChunkQuestionsAndAnswers(chunk.content, index, chunkInfos.length),
  );

  const allResults = await Promise.all(allPromises);
  const parseTime = ((Date.now() - parseStartTime) / 1000).toFixed(2);

  const totalRawQuestions = allResults.reduce(
    (sum, chunk) => sum + chunk.length,
    0,
  );

  logger.info('All chunks processed in parallel', {
    totalChunks: chunkInfos.length,
    parseTimeSeconds: parseTime,
    totalQuestions: totalRawQuestions,
  });

  // Deduplicate questions (same question might appear in multiple chunks)
  const seenQuestions = new Map<string, QuestionAnswer>();

  for (const qaArray of allResults) {
    for (const qa of qaArray) {
      const normalizedQuestion = qa.question.toLowerCase().trim();
      if (!seenQuestions.has(normalizedQuestion)) {
        seenQuestions.set(normalizedQuestion, qa);
      }
    }
  }

  const uniqueResults = Array.from(seenQuestions.values());

  logger.info('Parsing complete', {
    totalQuestions: uniqueResults.length,
    duplicatesRemoved: totalRawQuestions - uniqueResults.length,
  });

  return uniqueResults;
}

/**
 * Parses questions and answers from a single chunk of content
 */
export async function parseChunkQuestionsAndAnswers(
  chunk: string,
  chunkIndex: number,
  totalChunks: number,
): Promise<QuestionAnswer[]> {
  try {
    const { object } = await generateObject({
      model: openai(PARSING_MODEL),
      schema: jsonSchema({
        type: 'object',
        properties: {
          questionsAndAnswers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string', description: 'The question text' },
                answer: {
                  anyOf: [{ type: 'string' }, { type: 'null' }],
                  description:
                    'The answer to the question. Use null if no answer is provided.',
                },
              },
              required: ['question'],
            },
          },
        },
        required: ['questionsAndAnswers'],
      }),
      system: QUESTION_PARSING_SYSTEM_PROMPT,
      prompt: buildParsingPrompt(chunk, chunkIndex, totalChunks),
    });

    const parsed = (object as { questionsAndAnswers?: QuestionAnswer[] })
      ?.questionsAndAnswers;

    // Handle case where LLM returns unexpected response
    if (!parsed || !Array.isArray(parsed)) {
      return [];
    }

    // Post-process to ensure empty strings are converted to null
    return parsed
      .filter(
        (qa) => qa && typeof qa.question === 'string' && qa.question.trim(),
      )
      .map((qa) => ({
        question: qa.question.trim(),
        answer:
          qa.answer && typeof qa.answer === 'string' && qa.answer.trim() !== ''
            ? qa.answer.trim()
            : null,
      }));
  } catch (error) {
    // Log error but don't fail the entire parsing
    console.error(
      `Error parsing chunk ${chunkIndex + 1}/${totalChunks}:`,
      error,
    );
    return [];
  }
}

function buildParsingPrompt(
  chunk: string,
  chunkIndex: number,
  totalChunks: number,
): string {
  const instructions = `Instructions:
- Extract all question → answer pairs from this questionnaire data
- IMPORTANT: Look for the actual question TEXT (full sentences), NOT just question IDs like "SQ14.3"
- The question text is the cell containing a full sentence (often ending with "?" or starting with What/How/Do/Is/Are/Does/Can/Will/Should)
- Match each question to its corresponding Response/Answer value from the same row
- If the Response/Answer is empty, set answer to null
- Skip section headers and metadata rows`;

  if (totalChunks > 1) {
    return `${instructions}

Chunk ${chunkIndex + 1} of ${totalChunks}:
${chunk}`;
  }

  return `${instructions}

Content:
${chunk}`;
}

/**
 * Builds question-aware chunks from content
 * Each chunk contains exactly one question for parallel processing
 */
export function buildQuestionAwareChunks(
  content: string,
  options: {
    maxChunkChars: number;
    minChunkChars: number;
    maxQuestionsPerChunk: number;
  },
): ChunkInfo[] {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return [];
  }

  const chunks: ChunkInfo[] = [];
  const lines = trimmedContent.split(/\r?\n/);
  let currentChunk: string[] = [];
  let currentQuestionFound = false;

  const pushChunk = () => {
    const chunkText = currentChunk.join('\n').trim();
    if (!chunkText) {
      return;
    }
    chunks.push({
      content: chunkText,
      questionCount: 1,
    });
    currentChunk = [];
    currentQuestionFound = false;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    const isEmpty = trimmedLine.length === 0;
    const looksLikeQuestion = !isEmpty && looksLikeQuestionLine(trimmedLine);

    // If we find a new question and we already have a question in the current chunk, start a new chunk
    if (looksLikeQuestion && currentQuestionFound && currentChunk.length > 0) {
      pushChunk();
    }

    // Add line to current chunk (including empty lines for context)
    if (!isEmpty || currentChunk.length > 0) {
      currentChunk.push(line);
    }

    // Mark that we've found a question in this chunk
    if (looksLikeQuestion) {
      currentQuestionFound = true;
    }
  }

  // Push the last chunk if it has content
  if (currentChunk.length > 0) {
    pushChunk();
  }

  // If no questions were detected, return the entire content as a single chunk
  return chunks.length > 0
    ? chunks
    : [
        {
          content: trimmedContent,
          questionCount: estimateQuestionCount(trimmedContent),
        },
      ];
}

/**
 * Checks if a line looks like a question or form field
 */
export function looksLikeQuestionLine(line: string): boolean {
  // Line contains question mark anywhere (for "Question: xxx?" format)
  const hasQuestionMark = /[?？]/.test(line);

  // Line starts with or contains "Question:" label (from our formatted Excel output)
  const questionLabel = /question\s*:/i;

  // Line starts with optional number prefix, then explicit question/q label
  const explicitQuestionPrefix = /^(?:\d+\s*[\).\]]\s*)?(?:question|q)\b/i;

  // Interrogative words at the START of line
  const interrogativePrefix =
    /^(?:what|why|how|when|where|is|are|does|do|can|will|should|list|describe|explain)\b/i;

  // Numbered questions: "06. Do you have...", "1) What is...", "Q1: How do..."
  // This handles questions where a number/prefix comes before the interrogative
  const numberedQuestionWithInterrogative =
    /^(?:\d+\s*[\).\]:]\s*|[qQ]\d*\s*[\).\]:]\s*)(?:what|why|how|when|where|is|are|does|do|can|will|should|have|list|describe|explain|if)\b/i;

  // Form-style numbered fields: "1.1 Vendor Name", "2.3 Contact Email", "1.4 Company Address"
  // Pattern: number.number followed by a word (the field label)
  const formStyleNumberedField = /^\d+\.\d+\s+\w+/;

  // Items with required marker or selection notes
  const hasRequiredMarker = /\*\s*$/.test(line);
  const hasSelectionNote =
    /\((?:single|multiple)\s+selection|allows?\s+other|required\)/i.test(line);

  return (
    hasQuestionMark ||
    questionLabel.test(line) ||
    explicitQuestionPrefix.test(line) ||
    interrogativePrefix.test(line) ||
    numberedQuestionWithInterrogative.test(line) ||
    formStyleNumberedField.test(line) ||
    hasRequiredMarker ||
    hasSelectionNote
  );
}

/**
 * Estimates the number of questions in a text
 */
export function estimateQuestionCount(text: string): number {
  const questionMarks = text.match(/[?？]/g)?.length ?? 0;
  if (questionMarks > 0) {
    return questionMarks;
  }
  const lines = text
    .split(/\r?\n/)
    .filter((line) => looksLikeQuestionLine(line.trim()));
  if (lines.length > 0) {
    return lines.length;
  }
  // Fallback heuristic: assume roughly one question per 1200 chars
  return Math.max(1, Math.floor(text.length / 1200));
}
