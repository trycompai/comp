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

// Generic fallback inclusion justification used when no family-specific text applies.
export const DEFAULT_INCLUSION_JUSTIFICATION =
  'Applicable because this control is within our ISMS scope and requires documented implementation and rationale.';

/**
 * Default inclusion justifications by ISO 27001:2022 control family.
 * Used when a control is deemed Applicable but the LLM did not supply a justification.
 * Controls outside these named families intentionally receive no default justification.
 */
export const INCLUSION_JUSTIFICATIONS = {
  accessControl:
    'Applicable because the organisation must restrict access to systems and information based on business need, user role, and information security risk.',
  supplierCloud:
    'Applicable because third-party and cloud services are used within the ISMS scope and must be governed to manage supplier and service-provider risk.',
  incidentManagement:
    'Applicable because the organisation requires defined processes to identify, report, assess, respond to, and learn from information security events and incidents.',
  secureDevelopment:
    'Applicable because software or system changes are developed, configured, tested, or deployed within the ISMS scope.',
  legalPrivacyCompliance:
    'Applicable because legal, regulatory, contractual, privacy, and records-protection obligations must be identified and met.',
  physicalRemoteWorking:
    'Applicable only where physical, endpoint, home-working, or off-premises asset risks exist; otherwise the control should be excluded with a clear rationale.',
} as const;

// Maps each ISO 27001:2022 control closure code to a family key in INCLUSION_JUSTIFICATIONS.
const CLOSURE_TO_FAMILY: Record<string, keyof typeof INCLUSION_JUSTIFICATIONS> = {
  // Access control (organizational + technical)
  '5.15': 'accessControl',
  '5.16': 'accessControl',
  '5.17': 'accessControl',
  '5.18': 'accessControl',
  '8.2': 'accessControl',
  '8.3': 'accessControl',
  '8.4': 'accessControl',
  '8.5': 'accessControl',
  // Supplier and cloud
  '5.19': 'supplierCloud',
  '5.20': 'supplierCloud',
  '5.21': 'supplierCloud',
  '5.22': 'supplierCloud',
  '5.23': 'supplierCloud',
  // Incident management and continuity
  '5.24': 'incidentManagement',
  '5.25': 'incidentManagement',
  '5.26': 'incidentManagement',
  '5.27': 'incidentManagement',
  '5.28': 'incidentManagement',
  '5.29': 'incidentManagement',
  '5.30': 'incidentManagement',
  '6.8': 'incidentManagement',
  // Secure development
  '8.25': 'secureDevelopment',
  '8.26': 'secureDevelopment',
  '8.27': 'secureDevelopment',
  '8.28': 'secureDevelopment',
  '8.29': 'secureDevelopment',
  '8.30': 'secureDevelopment',
  '8.31': 'secureDevelopment',
  '8.32': 'secureDevelopment',
  '8.33': 'secureDevelopment',
  '8.34': 'secureDevelopment',
  // Legal, privacy, compliance, data protection
  '5.31': 'legalPrivacyCompliance',
  '5.32': 'legalPrivacyCompliance',
  '5.33': 'legalPrivacyCompliance',
  '5.34': 'legalPrivacyCompliance',
  '5.35': 'legalPrivacyCompliance',
  '5.36': 'legalPrivacyCompliance',
  '8.10': 'legalPrivacyCompliance',
  '8.11': 'legalPrivacyCompliance',
  '8.12': 'legalPrivacyCompliance',
  // Physical and remote working (all section 7 plus 6.7)
  '6.7': 'physicalRemoteWorking',
};

/**
 * Returns a default inclusion justification appropriate to the control's family,
 * or null when the control does not fall into one of the named families.
 */
export function getInclusionJustification(
  closure: string | null | undefined,
): string | null {
  if (!closure) return null;

  // All of section 7 (7.1–7.14) is physical security.
  if (closure.startsWith('7.')) {
    return INCLUSION_JUSTIFICATIONS.physicalRemoteWorking;
  }

  const family = CLOSURE_TO_FAMILY[closure];
  return family ? INCLUSION_JUSTIFICATIONS[family] : DEFAULT_INCLUSION_JUSTIFICATION;
}

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
