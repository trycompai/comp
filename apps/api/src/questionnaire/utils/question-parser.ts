import { openai } from '@ai-sdk/openai';
import { generateObject, jsonSchema } from 'ai';
import {
  MAX_CHUNK_SIZE_CHARS,
  MAX_CLASSIFICATION_CONCURRENCY,
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

export type QuestionnaireItemClassification =
  | 'answerable_item'
  | 'metadata'
  | 'section_header'
  | 'instruction'
  | 'guidance'
  | 'example'
  | 'scoring'
  | 'noise';

interface ClassifiedQuestionnaireItem {
  text: string;
  classification: QuestionnaireItemClassification;
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

export function sanitizeParsedAnswer(
  answer: string | null | undefined,
): string | null {
  const trimmed = answer?.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const isPlaceholder =
    /^(?:\d+#\s*-\s*)?a\s+(?:remplir|completer)$/.test(normalized) ||
    normalized === 'to be completed' ||
    normalized === 'to fill';

  const isScoringOptions =
    /^\((?:oui|yes|non|no|n\/a|na)\s*:\s*-?\d+(?:\s*,\s*(?:oui|yes|non|no|n\/a|na)\s*:\s*-?\d+)*\)$/.test(
      normalized,
    );

  if (isPlaceholder || isScoringOptions) {
    return null;
  }

  return trimmed;
}

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
  });

  if (chunkInfos.length === 0) {
    logger.warn('No content found after preprocessing, returning empty result');
    return [];
  }

  logger.info('Classifying questionnaire content in chunks', {
    contentLength: content.length,
    totalChunks: chunkInfos.length,
    concurrency: MAX_CLASSIFICATION_CONCURRENCY,
  });

  const parseStartTime = Date.now();
  const allResults = await mapWithConcurrency(
    chunkInfos.map((chunk, index) => ({ chunk, index })),
    MAX_CLASSIFICATION_CONCURRENCY,
    ({ chunk, index }) =>
      parseChunkQuestionsAndAnswers(chunk.content, index, chunkInfos.length),
  );
  const parseTime = ((Date.now() - parseStartTime) / 1000).toFixed(2);

  const totalRawQuestions = allResults.reduce(
    (sum, chunk) => sum + chunk.length,
    0,
  );

  logger.info('All chunks classified', {
    totalChunks: chunkInfos.length,
    parseTimeSeconds: parseTime,
    totalQuestions: totalRawQuestions,
  });

  // Deduplicate questions (same question might appear in multiple chunks)
  const seenQuestions = new Map<string, QuestionAnswer>();

  for (const qaArray of allResults) {
    for (const qa of qaArray) {
      const normalizedQuestion = normalizeQuestionForDedupe(qa.question);
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
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description:
                    'The exact text of the content block or row being classified.',
                },
                classification: {
                  type: 'string',
                  enum: [
                    'answerable_item',
                    'metadata',
                    'section_header',
                    'instruction',
                    'guidance',
                    'example',
                    'scoring',
                    'noise',
                  ],
                  description:
                    'Whether this text is an answerable questionnaire item or non-answerable content.',
                },
              },
              required: ['text', 'classification'],
              additionalProperties: false,
            },
          },
        },
        required: ['items'],
        additionalProperties: false,
      }),
      system: QUESTION_PARSING_SYSTEM_PROMPT,
      prompt: buildParsingPrompt(chunk, chunkIndex, totalChunks),
    });

    const parsed = (object as { items?: ClassifiedQuestionnaireItem[] })?.items;

    if (!parsed || !Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item) =>
          item &&
          item.classification === 'answerable_item' &&
          typeof item.text === 'string' &&
          item.text.trim(),
      )
      .map((item) => ({
        question: item.text.trim(),
        answer: null,
      }));
  } catch (error) {
    console.error(
      `Error parsing chunk ${chunkIndex + 1}/${totalChunks}:`,
      error,
    );
    throw error;
  }
}

function buildParsingPrompt(
  chunk: string,
  chunkIndex: number,
  totalChunks: number,
): string {
  const instructions = `Instructions:
- Classify the provided questionnaire rows/blocks.
- Return only blocks that the respondent is expected to answer as classification = "answerable_item".
- An answerable item can be a question, request, field label, or compliance statement. It does not need a question mark and can be in any language.
- Extract the FULL item text, not just IDs like "SQ14.3".
- Classify pure section headers, metadata, instructions, scoring/options, examples, guidance, remediation plans, and placeholders as non-answerable.
- Never classify values like "(Oui : 0, Non : 3)", "A remplir", "A compléter", or "To be completed" as answerable.
- Do not return existing answers from the source file. This upload flow generates answers later, so persisted answers must be null.
- Prefer high recall for real answerable items, but do not include obvious metadata or instructions just to avoid returning zero items.`;

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
  options: { maxChunkChars: number },
): ChunkInfo[] {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return [];
  }

  const chunks: ChunkInfo[] = [];
  const lines = trimmedContent.split(/\r?\n/);
  let currentChunk: string[] = [];
  let currentSize = 0;

  const pushChunk = () => {
    const chunkText = currentChunk.join('\n').trim();
    if (!chunkText) {
      return;
    }
    chunks.push({
      content: chunkText,
      questionCount: estimateQuestionCount(chunkText),
    });
    currentChunk = [];
    currentSize = 0;
  };

  for (const line of lines) {
    const lineSize = line.length + 1;
    if (
      currentChunk.length > 0 &&
      currentSize + lineSize > options.maxChunkChars
    ) {
      pushChunk();
    }

    if (line.trim() || currentChunk.length > 0) {
      currentChunk.push(line);
      currentSize += lineSize;
    }
  }

  // Push the last chunk if it has content
  if (currentChunk.length > 0) {
    pushChunk();
  }

  return chunks;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () =>
      runWorker(),
    ),
  );

  return results;
}

function normalizeQuestionForDedupe(question: string): string {
  return question
    .toLowerCase()
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/^\d+\.\d+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
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
  const explicitQuestionPrefix = /^(?:\d+\s*[.)\]]\s*)?(?:question|q)\b/i;

  // Interrogative words at the START of line
  const interrogativePrefix =
    /^(?:what|why|how|when|where|is|are|does|do|can|will|should|list|describe|explain)\b/i;

  // Numbered questions: "06. Do you have...", "1) What is...", "Q1: How do..."
  // This handles questions where a number/prefix comes before the interrogative
  const numberedQuestionWithInterrogative =
    /^(?:\d+\s*[.):\]]\s*|[qQ]\d*\s*[.):\]]\s*)(?:what|why|how|when|where|is|are|does|do|can|will|should|have|list|describe|explain|if)\b/i;

  // Form-style numbered fields: "1.1 Vendor Name", "2.3 Contact Email", "1.4 Company Address"
  // Pattern: number.number followed by a word (the field label)
  const formStyleNumberedField = /^\d+\.\d+\s+\w+/;

  // Items with required marker or selection notes
  const hasRequiredMarker = /\*\s*$/.test(line);
  const hasSelectionNote =
    /\((?:single|multiple)\s+selection|allows?\s+other|required\)/i.test(line);

  // Compliance-statement style: "The organization X", "We have X", "Our company X"
  // Vendor questionnaires often consist entirely of these — each is a row
  // the respondent must address.
  const compliancePrefix =
    /^(?:the\s+organization|the\s+company|the\s+vendor|the\s+supplier|the\s+respondent|our\s+(?:organization|company|team))\b/i;

  return (
    hasQuestionMark ||
    questionLabel.test(line) ||
    explicitQuestionPrefix.test(line) ||
    interrogativePrefix.test(line) ||
    numberedQuestionWithInterrogative.test(line) ||
    formStyleNumberedField.test(line) ||
    hasRequiredMarker ||
    hasSelectionNote ||
    compliancePrefix.test(line)
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
