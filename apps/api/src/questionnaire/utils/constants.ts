/**
 * Shared constants for questionnaire module
 */

// Chunk sizes for question-aware parsing
export const MAX_CHUNK_SIZE_CHARS = 80_000;
export const MIN_CHUNK_SIZE_CHARS = 5_000;
export const MAX_QUESTIONS_PER_CHUNK = 1;

// File size limits
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

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

export const QUESTION_PARSING_SYSTEM_PROMPT = `You parse vendor questionnaires from Excel, PDF, or document text. Extract all items the respondent is expected to answer (questions, prompts, or compliance statements) and pair each with its answer if one exists.

What counts as an item to extract:
1. Interrogative questions ending with "?" or starting with What/How/Why/When/Where/Is/Are/Do/Does/Can/Will/Should.
2. Form fields like "1.1 Vendor Name", "Contact Email", "Company Address" (numbered or labeled fields requesting information).
3. Compliance/requirement statements that the respondent must confirm or describe their compliance with — vendor questionnaires often consist entirely of these. Examples:
   - "The organization must X"
   - "The organization has X"
   - "The organization ensures Y"
   - "The organization implements Z"
   - "We have a documented procedure for X"
   Each such statement is one item, even with no question mark.
4. Items marked with "*", "(required)", "(Single selection allowed)", "(Multiple selections allowed)".

Input format hints:
- Tables have rows like: [Question] ID | [Question Text] actual text | [Response] answer | [Comment] notes
- Or simpler: [Question] text | [Response] answer
- Lines starting with [COLUMNS:] show column headers — use them to find the right column.
- Single-column checklists: each row IS the item. The answer column may be empty (set answer = null).

Rules:
1. Find the column containing the actual item text, not just IDs/numbers (e.g., skip "SQ14.3", keep the full sentence).
2. Extract the FULL text of each item.
3. Match each item to its Response/Answer text from the same row. If empty or missing, set answer = null.
4. Skip pure section headers ("Information Security Program", "General Information") UNLESS they are also items the respondent must answer.
5. Skip metadata rows (Company Name, Date, file headers).
6. NEVER return zero items if the document has any rows of substantive content — extract every row that looks like an item the respondent must address.`;

// Vision extraction prompt for PDFs and images
export const VISION_EXTRACTION_PROMPT = `Transcribe this document into plain text. Output ONLY the document's text content — no summaries, no analysis, no commentary about what the document is or whether it contains questions.

Rules:
- Output every visible row, cell, paragraph, list item, and heading. Do not skip rows that "look like statements" — vendor questionnaires often consist entirely of compliance/requirement statements ("The organization must X", "The organization has X") that the respondent fills in, with no question marks or interrogatives.
- For tables: preserve row order and use " | " to separate cells in the same row. If columns have headers (e.g., Question, Response, Answer, Comment), keep them and prefix each cell with [Header].
- For single-column checklists (one statement per row): output one statement per line, in document order.
- For each row, include any answer/response/comment text from adjacent columns or rows, even if the answer cell is blank.
- Do NOT add bullet points, numbering, or formatting that wasn't in the source.
- Do NOT write things like "no questions found", "this is a compliance document", or any meta-analysis. Just transcribe the content.

The downstream parser will identify which rows are questions/items and which are answers — your only job is to faithfully extract the text.`;
