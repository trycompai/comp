import type { TemplateControl as Control } from "../types";

export const securityEventCommunication: Control = {
	id: "security_event_communication",
	name: "Security Event Communication",
	description:
		"The organization identifies, develops, and implements activities to communicate security incidents to affected parties.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "incident_response_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "incident_communication_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e851403a5c3114dc746ba",
		},
	],
};
