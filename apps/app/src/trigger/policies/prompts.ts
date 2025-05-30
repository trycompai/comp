import { companyDetailslatestVersionSchema } from "@/app/[locale]/(app)/(dashboard)/[orgId]/implementation/lib/models/CompanyDetails";
import { Policy, Risk } from "@comp/db/types";
import { logger } from "@trigger.dev/sdk/v3";
import { JSONContent } from "novel";
import { z } from "zod";

export const generatePrompt = ({
	companyDetails,
	risks,
	policy,
	existingPolicyContent,
}: {
	companyDetails: z.infer<typeof companyDetailslatestVersionSchema>;
	risks: Risk[];
	policy: Policy;
	existingPolicyContent: JSONContent | JSONContent[];
}) => {
	logger.info(`Generating prompt for policy ${policy.name}`);
	logger.info(
		`Existing policy content: ${JSON.stringify(existingPolicyContent)}`,
	);

	return `
You are my virtual SOC 2 Policy Tailoring Engine. 

Your task is to take any generic SOC 2 policy templates formatted in tipTap JSON I provide and rewrite it so it exactly matches the reality of this company with no leftover boiler-plate, no marketing fluff.
Company profile – embed these facts verbatim:

Legal Entity: ${companyDetails.companyName}
Public Website: ${companyDetails.companyWebsite}
Product Names:-
Business Model: 
Headcount: ${companyDetails.headcount}, ${companyDetails.workStyle}
Primary Tech Stack: ${companyDetails.vendors.join(", ")}

Data Types Held: Personal Info
Primary Storage Regions: ${companyDetails.storageRegions}
Identity Provider: ${companyDetails.identityProviders}
Endpoints: ${companyDetails.laptopOS.join(", ")}, ${companyDetails.mobileDevice ? "employee-owned mobile devices allowed" : ""}
Key Vendors / Sub-processors:

Top Risks:

${risks.map((risk, index) => `${index + 1}. ${risk.title}`).join("\n")}

Tailoring rules:
Contextualise every section with company Secure-specific systems, regions, and roles.
Replace office-centric language with cloud and home-office equivalents.
Build control statements that directly mitigate the listed risks; remove irrelevant clauses.
Use mandatory language such as “must” or “shall”; specify measurable review cycles (quarterly, annually).
End with a bullet list of auditor evidence artefacts (logs, tickets, approvals, screenshots).
Limit to three-sentence executive summary and maximum 600-word main body.
Wrap any unresolved detail in <<TO REVIEW>>. 

1.Remove Document Version Control section altogether(if present) and also adjust numbering accordingly
2.Remove employee headcount
3.Also make table of contents during providing my with response
4. and also give me the table of contents and also changes heading where you can to similar words ,please not as same as the templates ,
5.Change heading(Which one can be done)to similar words ,so that they don't exactly match up with the template
6.Give me executive summary on top of the file
7..Wrap any unresolved detail in <<TO REVIEW>>(High Priority, is a must)
8.If you see a table, remove it
9.Number 1 in Table of Contents will be Document Content Page 
10.I want to document to be strictly aligned with SOC 2 standards and controls
11.Document to follow this type of headings as follows:-
Table of contents

2. 

2.1 Purpose

2.2 Scope

2.3 

2.4 

2.5 

2.6 

2.7 

3. Policy Compliance

3.1 Compliance Measurement

3.2 Exceptions

3.3 Non-Compliance

3.4 Continual Improvement

SOC 2 Policy Title: ${policy.name}
SOC 2 Policy: ${policy.description}


Here is the initial template policy to edit:

${existingPolicyContent}
`;
};
