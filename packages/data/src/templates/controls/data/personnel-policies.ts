import type { TemplateControl as Control } from "../types";

export const personnelPolicies: Control = {
	id: "personnel_policies",
	name: "Personnel Policies",
	description:
		"The organization holds individuals accountable for their internal control responsibilities in the pursuit of objectives.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "human_resources_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "personnel_compliance_documentation",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514778fd2238a33c121",
		},
	],
};
