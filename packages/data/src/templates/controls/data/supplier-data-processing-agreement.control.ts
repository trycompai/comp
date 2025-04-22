import type { TemplateControl } from "../types";

export const supplierDataProcessingAgreementControl: TemplateControl = {
	id: "supplier_dpa_control",
	name: "Supplier DPA Execution and Compliance",
	description:
		"Verify that Data Processing Agreements (DPAs) meeting GDPR Article 28 requirements are in place with all relevant third-party processors (suppliers) and that compliance is monitored.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "supplier_data_processing_agreement",
		},
		{
			type: "evidence",
			evidenceId: "supplier_dpa_evidence",
		},
	],
	mappedRequirements: [
		{ frameworkId: "gdpr", requirementId: "A30" },
		{ frameworkId: "gdpr", requirementId: "A32" },
	],
};
