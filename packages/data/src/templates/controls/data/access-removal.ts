import type { TemplateControl as Control } from "../types";

export const accessRemoval: Control = {
	id: "access_removal",
	name: "Access Removal",
	description:
		"The organization removes access to protected information assets when appropriate.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "access_control_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "access_removal_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514753b4054f1a632e7",
		},
	],
};
