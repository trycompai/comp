import type { TemplateControl } from "../types";

export const dataBreachResponseControl: TemplateControl = {
	id: "data_breach_response_control",
	name: "Data Breach Response Procedure Review",
	description:
		"Verify that the Data Breach Response and Notification Procedure is followed, including timely identification, assessment, containment, risk evaluation, and required notifications (SA & data subjects) as per GDPR Articles 33 & 34.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "data_breach_response",
		},
		{
			type: "evidence",
			evidenceId: "data_breach_response_evidence",
		},
	],
	mappedRequirements: [
		{ frameworkId: "gdpr", requirementId: "A4" },
		{ frameworkId: "gdpr", requirementId: "A33" },
		{ frameworkId: "gdpr", requirementId: "A34" },
	],
};
