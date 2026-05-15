import { z } from 'zod';

/**
 * Output shape of the "About this check" panel auditors see when they
 * expand a finding. Tier 3 = title, description, pass/fail criteria,
 * rationale. NOTHING ELSE — no compliance control numbers, no external
 * URLs, no framework claims. Server-side validation strips forbidden
 * content before persisting to the cache.
 */
export const checkDescriptionSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(160)
    .describe('Plain-English summary of what this check verifies (~1 sentence).'),
  description: z
    .string()
    .min(20)
    .max(600)
    .describe(
      'What the check actually verifies in plain English (1-3 sentences). No control numbers, no URLs, no framework claims.',
    ),
  passCriteria: z
    .string()
    .min(10)
    .max(300)
    .describe(
      'The configuration condition that makes this check pass. 1 sentence.',
    ),
  failCriteria: z
    .string()
    .min(10)
    .max(300)
    .describe(
      'The configuration condition that makes this check fail. 1 sentence.',
    ),
  whyItMatters: z
    .string()
    .min(20)
    .max(600)
    .describe(
      'Security/risk rationale in plain English. 1-2 sentences. NO compliance citations.',
    ),
});

export type CheckDescription = z.infer<typeof checkDescriptionSchema>;

export const CHECK_DESCRIPTION_SYSTEM_PROMPT = `You write audit-friendly explanations of cloud-security checks.

Audience: an external auditor (SOC 2 / ISO 27001) reviewing the customer's environment. They need to TRUST the automation by understanding what each check verifies.

OUTPUT
- Return only the fields requested by the schema. Nothing else.
- Tone: neutral, professional, present tense, third person.
- Plain English. Avoid product jargon when a simpler word works.

HARD RULES (output that violates these is stripped server-side):
- DO NOT mention any specific compliance control number (no "SOC 2 CC6.1", "ISO 27001 A.9.4.3", "NIST AC-2", "HIPAA \xA7164.312", "CIS 1.8", "PCI 8.2.3", etc.).
- DO NOT name a compliance framework as if it requires this check (no "required by SOC 2", "ISO mandates", "HIPAA-aligned").
- DO NOT include any URL or external link.
- DO NOT invent product features the input doesn't describe.

Style: short, clear, factual.`;

export interface CheckDescriptionInput {
  provider: 'aws' | 'gcp' | 'azure' | string;
  serviceName: string | null;
  title: string;
  description: string | null;
  severity: string | null;
  remediation: string | null;
}

export function buildCheckDescriptionPrompt(input: CheckDescriptionInput): string {
  return [
    `Provider: ${input.provider.toUpperCase()}`,
    input.serviceName ? `Service: ${input.serviceName}` : null,
    `Severity: ${input.severity ?? 'unknown'}`,
    `Finding title: "${input.title}"`,
    input.description ? `Finding description: "${input.description}"` : null,
    input.remediation ? `Suggested remediation: "${input.remediation}"` : null,
    '',
    'Generate a CheckDefinition for this check. Focus on what the CHECK as a class verifies — not on the specific resource that failed.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Detect content that slipped past the prompt — typical AI hallucinations
 * we want to keep out of the rendered panel. Returns a list of regex
 * patterns that should NEVER match in production output.
 */
const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  // Compliance framework names (full)
  /\bSOC ?2\b/i,
  /\bISO ?27001\b/i,
  /\bISO ?27002\b/i,
  /\bHIPAA\b/i,
  /\bNIST\b/i,
  /\bPCI ?DSS\b/i,
  /\bCIS ?Benchmark\b/i,
  // Bare control-number citations following any of the known framework
  // prefixes — catches "CIS 1.8", "PCI 8.2.3", "NIST AC-2",
  // "HIPAA 164.312" even without the full framework name re-mentioned.
  /\b(CIS|PCI|NIST|HIPAA|HITRUST|FedRAMP) ?[A-Z]*[- ]?\d+(\.\d+){0,3}\b/i,
  // SOC 2 / ISO control-number formats
  /\bCC\d+\.\d+\b/i,
  /\bA\.\d+\.\d+(\.\d+)?\b/,
  // URLs
  /https?:\/\//i,
  /www\./i,
];

/**
 * Return the first forbidden pattern that matches any field's value, or
 * null when output is clean. Used as a server-side backstop to the prompt.
 */
export function findForbiddenContent(
  description: CheckDescription,
): { field: keyof CheckDescription; pattern: string } | null {
  for (const [field, value] of Object.entries(description) as [
    keyof CheckDescription,
    string,
  ][]) {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(value)) {
        return { field, pattern: pattern.source };
      }
    }
  }
  return null;
}
