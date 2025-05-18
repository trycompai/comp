import type { TemplateControl as Control } from "../types";

export const internalCommunication: Control = {
	id: "internal_communication",
	name: "Internal Communication",
	description:
		"The organization internally communicates information, including objectives and responsibilities for internal control.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "corporate_governance_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "communication_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e85140854c64019d53422",
		},
	],
};
