import type { TemplateControl } from "../types";

export const rightOfAccessControl: TemplateControl = {
	id: "right_of_access_control",
	name: "Right of Access (DSAR) Procedure Review",
	description:
		"Verify that the procedure for handling Data Subject Access Requests (DSARs) is followed correctly, ensuring timely responses, proper identity verification, complete data provision, and adherence to GDPR Article 15 requirements.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "right_of_access_policy",
		},
		{
			type: "evidence",
			evidenceId: "right_of_access_evidence",
		},
	],
	mappedRequirements: [{ frameworkId: "gdpr", requirementId: "A15" }],
};
