import type { TemplateControl as Control } from "../types";

export const accessRestrictionsForConfidentialData: Control = {
	id: "access_restrictions_for_confidential_data",
	name: "Access Restrictions for Confidential Data",
	description:
		"The entity restricts access to confidential information on a need-to-know basis.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "classification_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "access_logs",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514ae9bac0ace4829ae",
		},
	],
};
