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

export const QUESTION_PARSING_SYSTEM_PROMPT = `You parse vendor questionnaires from Excel spreadsheets. Extract all question-answer pairs.

Input format:
- Each row has columns like: [Question] ID | [Question Text] actual question | [Response] answer | [Comment] notes
- Or: [Question] actual question text | [Response] answer
- Lines starting with [COLUMNS:] show the column headers - use these to understand the structure
- The actual question TEXT is usually the longest cell, contains "?" or starts with What/How/Do/Is/Are/etc.

CRITICAL: The "Question" column might contain just an ID (like "SQ14.3") - look for the column with the ACTUAL question text!

Rules:
1. Find the column containing actual question sentences (not just IDs/numbers)
2. The question text is usually a full sentence ending with "?" or starting with interrogative words
3. Extract the FULL question text, not the question ID
4. Match each question to its Response/Answer from the same row
5. If Response is empty, set answer to null
6. Skip section headers (e.g., "Information Security Program", "General Information")
7. Skip metadata rows (Company Name, Date, etc.)`;

// Vision extraction prompt for PDFs and images
export const VISION_EXTRACTION_PROMPT = `Extract all text and identify question-answer pairs from this document.

Look for:
- Tables with columns labeled "Question", "Q", "Response", "Answer", "A", "Comment"
- Questions ending with "?" or starting with What/How/Why/When/Where/Is/Are/Do/Does/Can/Will/Should
- Numbered questions like "06. Do you have...", "1) What is...", "Q1: How do..."
- Section headers (e.g., "Information Security Program", "General Information") that group questions

For each question found:
- Extract the full question text (may omit number prefix)
- Match it to any nearby response/answer in the same row or adjacent cell
- If no answer is provided, note it as empty

Preserve the order of questions as they appear. Return Question → Answer pairs in a structured format.`;
