import type { TemplateControl as Control } from "../types";

export const inputProcessingAndOutputControls: Control = {
	id: "input_processing_and_output_controls",
	name: "Input, Processing, and Output Controls",
	description:
		"The entity validates the completeness and accuracy of data throughout processing.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "information_security_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "data_processing_logs",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e85145df1606ef144c69c",
		},
	],
};
