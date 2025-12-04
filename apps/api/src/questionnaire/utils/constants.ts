/**
 * Shared constants for questionnaire module
 */

// Chunk sizes for question-aware parsing
export const MAX_CHUNK_SIZE_CHARS = 80_000;
export const MIN_CHUNK_SIZE_CHARS = 5_000;
export const MAX_QUESTIONS_PER_CHUNK = 1;

// File size limits
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// LLM Model identifiers
export const PARSING_MODEL = 'gpt-5-mini';
export const ANSWER_MODEL = 'gpt-4o-mini';

// System prompts for answer generation
export const ANSWER_SYSTEM_PROMPT = `You are an expert at answering security and compliance questions for vendor questionnaires.

Your task is to answer questions based ONLY on the provided context from the organization's policies and documentation.

CRITICAL RULES:
1. Answer based ONLY on the provided context. Do not make up facts or use general knowledge.
2. If the context does not contain enough information to answer the question, respond with exactly: "N/A - no evidence found"
3. BE CONCISE. Give SHORT, direct answers. Do NOT provide detailed explanations or elaborate unnecessarily.
4. Use enterprise-ready language appropriate for vendor questionnaires.
5. If multiple sources provide information, synthesize them into ONE concise answer.
6. Do not include disclaimers or notes about the source unless specifically relevant.
7. Format your answer as a clear, professional response suitable for a vendor questionnaire.
8. Always write in first person plural (we, our, us) as if speaking on behalf of the organization.
9. Keep answers to 1-3 sentences maximum unless the question explicitly requires more detail.`;

export const QUESTION_PARSING_SYSTEM_PROMPT = `You parse vendor questionnaires. Return only genuine question text paired with its answer.
- Ignore table headers, column labels, metadata rows, or placeholder words such as "Question", "Company Name", "Department", "Assessment Date", "Name of Assessor".
- A valid question is a meaningful sentence (usually ends with '?' or starts with interrogatives like What/Why/How/When/Where/Is/Are/Do/Does/Can/Will/Should).
- Do not fabricate answers; if no answer is provided, set answer to null.
- Keep the original question wording but trim whitespace.`;

// Vision extraction prompt for PDFs and images
export const VISION_EXTRACTION_PROMPT = `Extract all text and identify question-answer pairs. Look for columns/sections labeled "Question", "Q", "Answer", "A". Match questions (ending with "?" or starting with What/How/Why/When/Is/Can/Do) to nearby answers. Preserve order. Return only Question → Answer pairs.`;

