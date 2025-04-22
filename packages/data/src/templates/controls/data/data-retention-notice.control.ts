import type { TemplateControl } from "../types";

export const dataRetentionNoticeControl: TemplateControl = {
	id: "data_retention_notice_control",
	name: "Data Retention Notice Review and Availability",
	description:
		"Verify that the Data Retention Notice accurately reflects data retention practices, is readily available to data subjects, and includes required information as per GDPR Articles 5, 13, 17, and 30.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "data_retention_notice",
		},
		{
			type: "evidence",
			evidenceId: "data_retention_notice_evidence",
		},
	],
	mappedRequirements: [
		{ frameworkId: "gdpr", requirementId: "A5" },
		{ frameworkId: "gdpr", requirementId: "A13" },
		{ frameworkId: "gdpr", requirementId: "A17" },
		{ frameworkId: "gdpr", requirementId: "A30" },
	],
};
