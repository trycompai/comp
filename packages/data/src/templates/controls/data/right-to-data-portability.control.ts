import type { TemplateControl } from "../types";

export const rightToDataPortabilityControl: TemplateControl = {
	id: "right_to_data_portability_control",
	name: "Right to Data Portability Procedure Review",
	description:
		"Verify that the procedure for handling data portability requests is followed, ensuring requests are assessed correctly based on legal basis and automation, data is provided in a structured, common, machine-readable format, and timelines are met as per GDPR Article 20.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "right_to_data_portability_policy",
		},
		{
			type: "evidence",
			evidenceId: "right_to_data_portability_evidence",
		},
	],
	mappedRequirements: [{ frameworkId: "gdpr", requirementId: "A20" }],
};
