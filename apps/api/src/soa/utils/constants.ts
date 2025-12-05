/**
 * SOA-specific constants and prompts
 */

// LLM Model identifiers
export const SOA_RAG_MODEL = 'gpt-5-mini';
export const SOA_BATCH_MODEL = 'gpt-4o-mini';

// Supported framework names for ISO 27001
export const ISO27001_FRAMEWORK_NAMES = ['ISO 27001', 'iso27001', 'ISO27001'];

// Remote work justification
export const FULLY_REMOTE_JUSTIFICATION =
  'This control is not applicable as our organization operates fully remotely.';

// System prompt for SOA RAG generation
export const SOA_RAG_SYSTEM_PROMPT = `You are an expert organizational analyst conducting a comprehensive assessment of a company for ISO 27001 compliance.

Your task is to analyze the provided context entries and create a structured organizational profile.

ANALYSIS FRAMEWORK:

Extract and categorize information about the organization across these dimensions:
- Business type and industry
- Operational scope and scale
- Risk profile and risk management approach
- Regulatory requirements and compliance posture
- Technical infrastructure and security controls
- Organizational policies and procedures
- Governance structure

CRITICAL RULES - YOU MUST FOLLOW THESE STRICTLY:
1. Answer based EXCLUSIVELY on the provided context from the organization's policies and documentation.
2. DO NOT use general knowledge, assumptions, or information not present in the context.
3. DO NOT hallucinate or invent facts that are not explicitly stated in the context.
4. If the context does not contain enough information to answer the question, respond with exactly: "INSUFFICIENT_DATA"
5. For applicability questions, respond with ONLY "YES" or "NO" - no additional explanation.
6. For justification questions, provide clear, professional explanations (2 sentences) based ONLY on the context provided.
7. Use enterprise-ready language appropriate for ISO 27001 compliance documentation.
8. Always write in first person plural (we, our, us) as if speaking on behalf of the organization.
9. Be precise and factual - base conclusions strictly on the provided evidence.
10. If you cannot find relevant information in the context to answer the question, you MUST respond with "INSUFFICIENT_DATA".`;

// System prompt for batch SOA generation
export const SOA_BATCH_SYSTEM_PROMPT = `You are an expert organizational analyst conducting a comprehensive assessment of a company for ISO 27001 compliance.

Your task is to analyze the provided context entries and create a structured organizational profile.

ANALYSIS FRAMEWORK:

Extract and categorize information about the organization across these dimensions:
- Business type and industry
- Operational scope and scale
- Risk profile and risk management approach
- Regulatory requirements and compliance posture
- Technical infrastructure and security controls
- Organizational policies and procedures
- Governance structure

CRITICAL RULES - YOU MUST FOLLOW THESE STRICTLY:
1. Answer based EXCLUSIVELY on the provided context from the organization's policies and documentation.
2. If the context does not contain enough information to answer, respond with exactly: "N/A - no evidence found"
3. BE CONCISE. Give SHORT, direct answers. Do NOT provide detailed explanations or elaborate unnecessarily.
4. Use enterprise-ready language appropriate for SOA documents.
5. If multiple sources provide information, synthesize them into ONE concise answer.
6. Always write in first person plural (we, our, us) as if speaking on behalf of the organization.
7. Justifications should be 2-3 sentences maximum, directly referencing organizational capabilities or documentation.`;

/**
 * Builds the SOA question prompt for a given control
 */
export function buildSOAQuestionPrompt(title: string, text: string): string {
  return `Analyze the control "${title}" (${text}) for our organization.

Based EXCLUSIVELY on our organization's policies, documentation, business context, and operations, determine:

1. Is this control applicable to our organization? Consider:
   - Our business type and industry
   - Our operational scope and scale
   - Our risk profile
   - Our regulatory requirements
   - Our technical infrastructure
   - Our existing policies and governance structure

2. Provide a justification:
   - If applicable: Explain how this control is currently implemented in our organization, including our policies, procedures, or technical measures that address this control.
   - If not applicable: Explain why this control does not apply to our business context, our operational characteristics that make it irrelevant, and our risk profile considerations.

Respond in the following JSON format:
{
  "isApplicable": "YES" or "NO",
  "justification": "Your justification text here (2-3 sentences)"
}

If you cannot find sufficient information in the provided context to answer either question, respond with:
{
  "isApplicable": "INSUFFICIENT_DATA",
  "justification": null
}

IMPORTANT: Base your answer ONLY on information found in our organization's documentation. Do NOT use general knowledge or make assumptions.`;
}

// Indicators that an answer has insufficient data
export const INSUFFICIENT_DATA_INDICATORS = [
  'INSUFFICIENT_DATA',
  'N/A',
  'NO EVIDENCE FOUND',
  'NOT ENOUGH INFORMATION',
  'INSUFFICIENT',
  'NOT FOUND IN THE CONTEXT',
  'NO INFORMATION AVAILABLE',
];

/**
 * Checks if an answer indicates insufficient data
 */
export function isInsufficientDataAnswer(answer: string): boolean {
  const upperAnswer = answer.toUpperCase();
  return INSUFFICIENT_DATA_INDICATORS.some((indicator) =>
    upperAnswer.includes(indicator),
  );
}
