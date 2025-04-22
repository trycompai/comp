import type { TemplateControl } from "../types";

export const rightToRestrictionControl: TemplateControl = {
	id: "right_to_restriction_control",
	name: "Right to Restriction Procedure Review",
	description:
		"Verify that the procedure for handling Right to Restriction requests (GDPR Art. 18) is followed, including timely response, identity verification, assessment of grounds (accuracy contested, unlawful processing, legal claims, objection pending), implementation of restriction measures (e.g., marking, moving data), notification to recipients (Art. 19), and communication with the data subject (confirming restriction or explaining refusal, and notification before lifting).",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "right_to_restriction_policy", // Link to the policy created earlier
		},
		{
			type: "evidence",
			evidenceId: "right_to_restriction_evidence", // Link to the evidence to be created
		},
	],
	mappedRequirements: [
		{ frameworkId: "gdpr", requirementId: "A18" }, // Maps to GDPR Article 18
		{ frameworkId: "gdpr", requirementId: "A19" }, // Maps to GDPR Article 19 (Notification obligation regarding restriction)
	],
};
