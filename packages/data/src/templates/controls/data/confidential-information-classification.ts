import type { TemplateControl as Control } from "../types";

export const confidentialInformationClassification: Control = {
	id: "confidential_information_classification",
	name: "Confidential Information Classification",
	description:
		"The entity classifies information to identify and protect confidential information.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "classification_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "data_classification_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514ae9bac0ace4829ae",
		},
	],
};
