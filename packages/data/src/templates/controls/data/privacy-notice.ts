import type { TemplateControl as Control } from "../types";

export const privacyNotice: Control = {
	id: "privacy_notice",
	name: "Privacy Notice",
	description:
		"The entity provides notice about the collection, use, and disclosure of personal information.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "privacy_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "privacy_notice",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514e2ebc08069c2c862",
		},
	],
};
