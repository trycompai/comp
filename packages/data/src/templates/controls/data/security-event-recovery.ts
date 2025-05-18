import type { TemplateControl as Control } from "../types";

export const securityEventRecovery: Control = {
	id: "security_event_recovery",
	name: "Security Event Recovery",
	description:
		"The organization implements recovery procedures to ensure timely restoration of systems or assets affected by security incidents.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "business_continuity_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "recovery_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e851403a5c3114dc746ba",
		},
	],
};
