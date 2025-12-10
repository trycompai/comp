import { FrameworkEditorFramework, FrameworkEditorPolicyTemplate } from '@db';
import { logger } from '@trigger.dev/sdk';

export const generatePrompt = ({
  policyTemplate,
  contextHub,
  companyName,
  companyWebsite,
  frameworks,
}: {
  contextHub: string;
  companyName: string;
  companyWebsite: string;
  policyTemplate: FrameworkEditorPolicyTemplate;
  frameworks: FrameworkEditorFramework[];
}) => {
  logger.info(`Generating prompt for policy ${policyTemplate.name}`);
  logger.info(`Company Name: ${companyName}`);
  logger.info(`Company Website: ${companyWebsite}`);
  logger.info(`Context: ${contextHub}`);
  logger.info(`Existing Policy Content: ${JSON.stringify(policyTemplate.content)}`);
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
  const hasSOC2 = frameworks.some(
    (f) => /soc\s*2/i.test(f.name) || f.name.toLowerCase().includes('soc'),
  );

  return `
Company: ${companyName} (${companyWebsite})
Frameworks selected: ${frameworkList}

Knowledge base:
${contextHub}

Task: Edit the provided TipTap JSON template to produce the final policy TipTap JSON. Apply ONLY the rules below.

Required rules (keep this simple):

1) Company details
   - If the template contains placeholders like {{...}}, replace ANY placeholder with information you actually have (from the knowledge base, company name, company website, frameworks context).
   - If a specific placeholder cannot be resolved, set it to "N/A" (do not invent values).
   - Only fill placeholders where the template asks; do not add new fields beyond the placeholders.
   - Placeholder legend (map values from the knowledge base Q&A where available):
     - {{COMPANY}}            ⇐ Company Name
     - {{COMPANYINFO}}        ⇐ Describe your company in a few sentences
     - {{INDUSTRY}}           ⇐ What Industry is your company in?
     - {{EMPLOYEES}}          ⇐ How many employees do you have
     - {{DEVICES}}            ⇐ What Devices do your team members use
     - {{SOFTWARE}}           ⇐ What software do you use
     - {{LOCATION}}           ⇐ How does your team work
     - {{CRITICAL}}           ⇐ Where do you host your application and data
     - {{DATA}}               ⇐ What type of data do you handle
     - {{GEO}}                ⇐ Where is your data located
   - If multiple answers exist, choose the most specific/concise form. If no answer is found for a placeholder, set it to "N/A".

2) Structure & style
   - Keep the same section order and general layout as the template (headings or bold titles as-is).
   - Do NOT copy instruction cue lines (e.g., "Add a HIPAA checklist...", "State that...", "Clarify that..."). Convert such cues into real policy language, and then remove the cue line entirely. If a cue precedes bullet points, keep the bullets but delete the cue line.

3) Handlebars-style conditionals
   - The template may contain conditional blocks using {{#if var}}...{{/if}} syntax (e.g., {{#if soc2}}, {{#if hipaa}}).
   - Evaluate these using the selected frameworks:
     - soc2 is ${hasSOC2 ? 'true' : 'false'}
     - hipaa is ${hasHIPAA ? 'true' : 'false'}
   - If the condition is true: keep only the inner content and remove the {{#if}}/{{/if}} markers.
   - If the condition is false: remove the entire block including its content.
   - For any other unknown {{#if X}} variables: assume false and remove the block.

Output: Return ONLY the final TipTap JSON document.

Template (TipTap JSON) to edit:
${JSON.stringify(policyTemplate.content)}
`;
};
