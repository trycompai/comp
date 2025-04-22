import type { TemplateControl } from "../types";

export const dataProtectionPolicyControl: TemplateControl = {
	id: "data_protection_policy_control",
	name: "Data Protection Policy Implementation Review",
	description:
		"Verify that appropriate technical and organizational measures outlined in the Data Protection Policy are implemented and maintained to ensure GDPR compliance (Art. 24), including data minimization, access control, security, and data protection by design/default principles.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "data_protection",
		},
		{
			type: "evidence",
			evidenceId: "data_protection_evidence",
		},
	],
	mappedRequirements: [
		{ frameworkId: "gdpr", requirementId: "A5" },
		{ frameworkId: "gdpr", requirementId: "A25" },
		{ frameworkId: "gdpr", requirementId: "A32" },
	],
};
