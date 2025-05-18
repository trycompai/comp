import type { TemplateControl as Control } from "../types";

export const organizationalStructure: Control = {
	id: "organizational_structure",
	name: "Organizational Structure",
	description:
		"The organization demonstrates a commitment to attract, develop, and retain competent individuals in alignment with objectives.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "human_resources_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "hr_documentation",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514778fd2238a33c121",
		},
	],
};
