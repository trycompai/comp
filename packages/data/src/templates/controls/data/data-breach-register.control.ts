import type { TemplateControl } from "../types";

export const dataBreachRegisterControl: TemplateControl = {
	id: "data_breach_register_control",
	name: "Data Breach Register Review",
	description:
		"Verify that the Data Breach Register is maintained, reviewed annually, and accurately records all required details of personal data breaches according to GDPR Article 33(5).",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "data_breach_register",
		},
		{
			type: "evidence",
			evidenceId: "data_breach_register_evidence",
		},
	],
	mappedRequirements: [{ frameworkId: "gdpr", requirementId: "A33" }],
};
