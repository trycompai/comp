import type { Control } from "../types";

export const infrastructureMonitoring: Control = {
	id: "infrastructure_monitoring",
	name: "Infrastructure Monitoring",
	description:
		"To detect and act upon security events in a timely manner, the organization monitors system capacity, security threats, and vulnerabilities.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "information_security",
		},
		{
			type: "evidence",
			evidenceId: "infrastructureMonitoringRecords",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "soc2",
			requirementId: "CC7",
		},
	],
};
