import type { TemplateControl as Control } from "../types";

export const codeOfConduct: Control = {
	id: "code_of_conduct",
	name: "Code of Conduct",
	description:
		"The organization demonstrates a commitment to integrity and ethical values.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "code_of_conduct_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "ethics_compliance_documentation",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514778fd2238a33c121",
		},
	],
};
