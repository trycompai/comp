import type { TemplateControl as Control } from "../types";

export const accessRestrictions: Control = {
	id: "access_restrictions",
	name: "Access Restrictions",
	description:
		"The organization restricts physical access to facilities and protected information assets.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "access_control_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "physical_access_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514753b4054f1a632e7",
		},
	],
};
