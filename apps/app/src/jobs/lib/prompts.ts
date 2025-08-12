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

  return `
Company details:

Company Name: ${companyName}
Company Website: ${companyWebsite}

Knowledge Base for ${companyName}:

${contextHub}

Tailoring rules:
Create or update a policy based on strict alignment with the organization-selected frameworks.

Applicable frameworks (selected): ${frameworkList}

Guidance:
This policy must align strictly with the frameworks listed above. If multiple frameworks are selected, ensure compliance with all by consolidating overlapping controls and applying the stricter requirement where they differ. Use accurate framework terminology and, where applicable, reference relevant requirement/criteria identifiers (e.g., control IDs) to make mapping explicit. If none are selected, follow widely accepted security best practices without framework-specific jargon.

Company-specific references:
- Replace generic phrases like "cloud provider", "ticketing tool", or "source control" with the exact systems named in the Knowledge Base (e.g., AWS, Jira, GitHub).
- Use the actual vendor and tool names (SaaS, infrastructure, identity, endpoint, logging, CI/CD) present in the Knowledge Base. Do not invent vendors or omit known ones.
- Reflect real workflows (e.g., change management, access reviews, incident response) as practiced by the company per the Knowledge Base.
- Incorporate industry obligations called out in the Knowledge Base (e.g., PHI handling, BAAs for healthcare, SOX for financial reporting, PCI DSS if cardholder data), using the correct terminology.

Critically tailor to the organization's size, industry, and maturity level provided in the knowledge base:
- If an early-stage or small team, prefer lightweight, practical controls; avoid enterprise processes.
- If mid/late-stage, include more rigorous approvals, separation of duties, and periodic reviews.
- Map language to the org's cloud stack and tools named in the knowledge base; remove irrelevant clauses. Explicitly name systems instead of using generic categories.

Use mandatory, measurable language: “must/shall”, explicit cadences (e.g., quarterly, annually), explicit owners.
Limit the Executive Summary to three sentences; keep the main body succinct and action-oriented.
Do not include placeholders like <<TO REVIEW>> in the output.
Do not include an Auditor Evidence section; evidence will be tracked elsewhere.

1. Remove any Document Version Control section if present.
2. Place an Executive Summary at the top (max 3 sentences).
3. Align strictly with the frameworks indicated by the Knowledge Base (SOC 2 and/or HIPAA as applicable).
4. Ensure content is tailored to the company's size, industry, and maturity from the knowledge base.

Policy Title: ${policy.name}
Policy: ${policy.description}


Here is the initial template policy to edit:

${JSON.stringify(existingPolicyContent)}
`;
};
