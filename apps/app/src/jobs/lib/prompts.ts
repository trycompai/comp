import { FrameworkEditorFramework, Policy } from '@db';
import type { JSONContent } from '@tiptap/react';
import { logger } from '@trigger.dev/sdk/v3';

export const generatePrompt = ({
  policy,
  existingPolicyContent,
  contextHub,
  companyName,
  companyWebsite,
  frameworks,
}: {
  contextHub: string;
  companyName: string;
  companyWebsite: string;
  policy: Policy;
  existingPolicyContent: JSONContent | JSONContent[];
  frameworks: FrameworkEditorFramework[];
}) => {
  logger.info(`Generating prompt for policy ${policy.name}`);
  logger.info(`Company Name: ${companyName}`);
  logger.info(`Company Website: ${companyWebsite}`);
  logger.info(`Context: ${contextHub}`);
  logger.info(`Existing Policy Content: ${JSON.stringify(existingPolicyContent)}`);
  logger.info(
    `Frameworks: ${JSON.stringify(
      frameworks.map((f) => ({ id: f.id, name: f.name, version: f.version })),
    )}`,
  );

  const frameworkList =
    frameworks.length > 0
      ? frameworks.map((f) => `${f.name} v${f.version}`).join(', ')
      : 'None explicitly selected';
  const hasHIPAA = frameworks.some((f) => f.name.toLowerCase().includes('hipaa'));

  return `
Company: ${companyName} (${companyWebsite})
Frameworks selected: ${frameworkList}

Knowledge base:
${contextHub}

Task: Edit the provided TipTap JSON template to produce the final policy TipTap JSON. Apply ONLY the rules below.

Required rules (keep this simple):
1) Framework sections
   - The template may contain framework-specific sections titled like "SOC 2 Specific" or "HIPAA Specific".
   - Keep only the sections for the selected frameworks. Remove the sections for unselected frameworks.
   - For the kept sections, remove the "<Framework> Specific" label and keep their bullets under the appropriate place.
   - Consolidate bullets if redundant; do not add new sections.

2) Company details
   - If the template asks to insert company info, replace placeholders (e.g., {{COMPANY_NAME}}, {{COMPANY_WEBSITE}}) with: ${companyName}, ${companyWebsite}.
   - Only add details where the template asks; do not invent new fields.

3) Vendors (keep focused)
   - Mention only vendors/tools that are critical or high-impact for this policy.
   - Do not invent vendors.
${
  hasHIPAA
    ? `   - If HIPAA is selected, inline-tag vendors when relevant: (criticality: high|medium|low; data: PHI|PII when applicable). No separate Vendors table.`
    : ''
}

4) Structure & style
   - Keep the same section order and general layout as the template (headings or bold titles as-is).
   - No Table of Contents. No control/criteria mapping section unless it already exists in the template.
   - Use concise, mandatory language (must/shall) with clear owners/cadences when appropriate.
   - Do NOT copy instruction cue lines (e.g., "Add a HIPAA checklist...", "State that...", "Clarify that..."). Convert such cues into real policy language, and then remove the cue line entirely. If a cue precedes bullet points, keep the bullets but delete the cue line.

Output: Return ONLY the final TipTap JSON document.

Template (TipTap JSON) to edit:
${JSON.stringify(existingPolicyContent)}
`;
};
