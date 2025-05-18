import type { TemplateControl as Control } from "../types";

export const confidentialDataDisposal: Control = {
	id: "confidential_data_disposal",
	name: "Confidential Data Disposal",
	description:
		"The entity securely disposes of confidential information when no longer needed.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "classification_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "disposal_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514ae9bac0ace4829ae",
		},
	],
};
