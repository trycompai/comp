import type { TemplateControl as Control } from "../types";

export const accessReview: Control = {
	id: "access_review",
	name: "Access Review",
	description:
		"The organization evaluates and manages access to protected information assets on a periodic basis.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "access_control_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "access_review_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514753b4054f1a632e7",
		},
	],
};
