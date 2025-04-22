import type { TemplateControl } from "../types";

export const dpiaRegisterControl: TemplateControl = {
	id: "dpia_register_control",
	name: "DPIA Register Maintenance and Review",
	description:
		"Verify that the DPIA Register documents all required Data Protection Impact Assessments for high-risk processing activities (GDPR Art. 35), including risk assessment and mitigation measures.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "dpia_register",
		},
		{
			type: "evidence",
			evidenceId: "dpia_register_evidence",
		},
	],
	mappedRequirements: [{ frameworkId: "gdpr", requirementId: "A35" }],
};
