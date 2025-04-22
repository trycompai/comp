import type { TemplateControl } from "../types";

export const dataRetentionScheduleControl: TemplateControl = {
	id: "data_retention_schedule_control",
	name: "Data Retention Schedule Accuracy and Adherence",
	description:
		"Verify that the Data Retention Schedule accurately documents retention periods for data categories based on legal/business needs (GDPR Art. 30) and that data disposal procedures are followed upon expiry.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "data_retention_schedule",
		},
		{
			type: "evidence",
			evidenceId: "data_retention_schedule_evidence",
		},
	],
	mappedRequirements: [{ frameworkId: "gdpr", requirementId: "A30" }],
};
