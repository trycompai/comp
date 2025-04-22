import type { TemplateEvidence } from "../types";

export const dataRetentionScheduleEvidence: TemplateEvidence = {
	id: "data_retention_schedule_evidence",
	name: "Data Retention Schedule Evidence",
	description:
		"Provide the reviewed Data Retention Schedule and evidence of adherence (e.g., logs of data disposal actions, audit report confirming schedule accuracy).",
	frequency: "yearly",
	department: "it",
};
