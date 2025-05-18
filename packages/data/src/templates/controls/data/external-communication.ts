import type { TemplateControl as Control } from "../types";

export const externalCommunication: Control = {
	id: "external_communication",
	name: "External Communication",
	description:
		"The organization communicates with external parties regarding matters affecting the functioning of internal control.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "corporate_governance_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "external_communication_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e85140854c64019d53422",
		},
	],
};
