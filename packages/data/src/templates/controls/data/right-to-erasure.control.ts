import type { TemplateControl } from "../types";

export const rightToErasureControl: TemplateControl = {
	id: "right_to_erasure_control",
	name: "Right to Erasure Procedure Review",
	description:
		"Verify that the procedure for handling Right to Erasure requests (GDPR Art. 17) is followed, including timely response, identity verification, assessment of grounds and exceptions, secure data deletion/anonymization across systems (including notification to recipients where applicable), and communication with the data subject.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "right_to_erasure_policy", // Link to the policy created earlier
		},
		{
			type: "evidence",
			evidenceId: "right_to_erasure_evidence", // Link to the evidence to be created
		},
	],
	mappedRequirements: [
		{ frameworkId: "gdpr", requirementId: "A17" }, // Maps to GDPR Article 17
		{ frameworkId: "gdpr", requirementId: "A19" }, // Maps to GDPR Article 19 (Notification obligation regarding erasure)
	],
};
