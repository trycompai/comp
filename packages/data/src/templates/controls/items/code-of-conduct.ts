import type { Control } from "../types";

export const codeOfConduct: Control = {
	id: "code_of_conduct",
	name: "Code of Conduct",
	description:
		"The organization demonstrates a commitment to integrity and ethical values.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "corporate_governance",
		},
		{
			type: "evidence",
			evidenceId: "ethics_compliance_documentation",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "soc2",
			requirementId: "CC1",
		},
	],
};
