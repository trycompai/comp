import type { TemplateEvidence } from "../types";

export const rightToRestrictionEvidence: TemplateEvidence = {
	id: "right_to_restriction_evidence",
	name: "Right to Restriction Procedure Evidence",
	description:
		"Provide records from the Data Subject Request Log demonstrating how restriction requests (GDPR Art. 18) were handled, including verification, assessment of grounds, confirmation of restriction implementation (e.g., system logs, screenshots showing data marking/unavailability), notification to recipients (if applicable), and communication with data subjects (confirming restriction or explaining refusal, and notification before lifting restriction).",
	frequency: "yearly", // Or 'ongoing' / 'per_request'
	department: "admin", // Or 'legal' / 'privacy'
};
