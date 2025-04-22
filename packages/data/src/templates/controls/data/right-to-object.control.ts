import type { TemplateControl } from "../types";

export const rightToObjectControl: TemplateControl = {
	id: "right_to_object_control",
	name: "Right to Object Procedure Review",
	description:
		"Verify that the procedure for handling objections to data processing is followed, ensuring objections based on legitimate interests/public task are correctly assessed, objections to direct marketing result in cessation, and data subjects are informed according to GDPR Article 21.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "right_to_object_policy",
		},
		{
			type: "evidence",
			evidenceId: "right_to_object_evidence",
		},
	],
	mappedRequirements: [{ frameworkId: "gdpr", requirementId: "A21" }],
};
