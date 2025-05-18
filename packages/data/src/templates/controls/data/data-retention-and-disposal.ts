import type { TemplateControl as Control } from "../types";

export const dataRetentionAndDisposal: Control = {
	id: "data_retention_and_disposal",
	name: "Data Retention and Disposal",
	description:
		"The entity retains personal information for only as long as needed and disposes of it securely.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "privacy_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "retention_schedules",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514e2ebc08069c2c862",
		},
	],
};
