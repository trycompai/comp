import { Policy, Risk } from '@comp/db/types';
import { logger } from '@trigger.dev/sdk/v3';
import { JSONContent } from 'novel';

export const generatePrompt = ({
  policy,
  existingPolicyContent,
  contextHub,
  companyName,
  companyWebsite,
}: {
  contextHub: string;
  companyName: string;
  companyWebsite: string;
  policy: Policy;
  existingPolicyContent: JSONContent | JSONContent[];
}) => {
  logger.info(`Generating prompt for policy ${policy.name}`);
  logger.info(`Company Name: ${companyName}`);
  logger.info(`Company Website: ${companyWebsite}`);
  logger.info(`Context: ${contextHub}`);
  logger.info(`Existing Policy Content: ${JSON.stringify(existingPolicyContent)}`);

  return `
Company details:

Company Name: ${companyName}
Company Website: ${companyWebsite}

Knowledge Base for ${companyName}:

${contextHub}

Tailoring rules:
Create or update a policy based on strict alignment with SOC 2 standards and controls.

Contextualise every section with company Secure-specific systems, regions, and roles.
Replace office-centric language with cloud and home-office equivalents.
Build control statements that directly mitigate the listed risks; remove irrelevant clauses.
Use mandatory language such as “must” or “shall”; specify measurable review cycles (quarterly, annually).
End with a bullet list of auditor evidence artefacts (logs, tickets, approvals, screenshots).
Limit to three-sentence executive summary and maximum 600-word main body.
Wrap any unresolved detail in <<TO REVIEW>>.

1.Remove Document Version Control section altogether(if present) and also adjust numbering accordingly
2. Make a table of contents (in tiptap format)
3. Give me executive summary on top of the document
4. Wrap any unresolved detail in <<TO REVIEW>>
5. Number 1 in Table of Contents will be Document Content Page
6. I want to document to be strictly aligned with SOC 2 standards and controls

Policy Title: ${policy.name}
Policy: ${policy.description}


Here is the initial template policy to edit:

${JSON.stringify(existingPolicyContent)}
`;
};
