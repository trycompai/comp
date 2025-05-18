import type { TemplateControl as Control } from "../types";

export const infrastructureMonitoring: Control = {
	id: "infrastructure_monitoring",
	name: "Infrastructure Monitoring",
	description:
		"To detect and act upon security events in a timely manner, the organization monitors system capacity, security threats, and vulnerabilities.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "information_security_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "infrastructure_monitoring_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e851403a5c3114dc746ba",
		},
	],
};
