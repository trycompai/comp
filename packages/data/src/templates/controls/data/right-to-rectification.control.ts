import type { TemplateControl } from "../types";

export const rightToRectificationControl: TemplateControl = {
	id: "right_to_rectification_control",
	name: "Right to Rectification Procedure Review",
	description:
		"Verify that the procedure for handling rectification requests is followed, ensuring requests are assessed correctly based on legal basis and automation, data is provided in a structured, common, machine-readable format, and timelines are met as per GDPR Article 16.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "right_to_rectification_policy",
		},
		{
			type: "evidence",
			evidenceId: "right_to_rectification_evidence",
		},
	],
	mappedRequirements: [{ frameworkId: "gdpr", requirementId: "A16" }],
};
