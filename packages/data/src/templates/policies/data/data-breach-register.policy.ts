import type { TemplatePolicy } from "../types";

export const dataBreachRegisterPolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "data_breach_register",
		slug: "data-breach-register",
		name: "Data Breach Register",
		description:
			"This document serves as the internal register for recording all personal data breaches, as required by Article 33(5) of the General Data Protection Regulation (GDPR).",
		frequency: "yearly",
		department: "it",
	},
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [{ type: "text", text: "Data Breach Register" }],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Register Information" }],
		},
		{
			type: "table",
			content: [
				{
					type: "tableRow",
					content: [
						{
							type: "tableHeader",
							content: [{ type: "text", text: "Organization" }],
						},
						{
							type: "tableHeader",
							content: [
								{ type: "text", text: "Last Review Date" },
							],
						},
						{
							type: "tableHeader",
							content: [
								{ type: "text", text: "Review Frequency" },
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "text",
									text: "Register Maintained By",
								},
							],
						},
						{
							type: "tableHeader",
							content: [{ type: "text", text: "Classification" }],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "{{organization}}" },
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "{{date}}" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Annually" }],
						},
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "[DPO/Compliance Team]" },
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Confidential" }],
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "1. Purpose and Scope" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The purpose of this register is to maintain a comprehensive internal record of all personal data breaches experienced by {{organization}}, regardless of whether notification to the Supervisory Authority or data subjects was required. This fulfills the documentation requirement under GDPR Article 33(5).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This register applies to any incident qualifying as a personal data breach under GDPR Article 4(12), affecting personal data for which {{organization}} acts as a data controller or data processor.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "2. Breach Log" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Each personal data breach must be recorded in the table below promptly after discovery and assessment.",
				},
			],
		},
		{
			type: "table",
			content: [
				{
					type: "tableRow",
					content: [
						{
							type: "tableHeader",
							content: [{ type: "text", text: "Breach ID" }],
						},
						{
							type: "tableHeader",
							content: [
								{ type: "text", text: "Date Discovered" },
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "text",
									text: "Date(s) of Breach (if known)",
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{ type: "text", text: "Facts of the Breach" },
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "text",
									text: "Categories of Personal Data Concerned",
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "text",
									text: "Approx. No. Data Subjects Concerned",
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "text",
									text: "Likely Consequences / Effects",
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "text",
									text: "Remedial Actions Taken",
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "text",
									text: "SA Notified? (Yes/No/N/A)",
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "text",
									text: "Date SA Notified / Reason Not Notified",
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "text",
									text: "Data Subjects Notified? (Yes/No/N/A)",
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "text",
									text: "Date DS Notified / Reason Not Notified",
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "text",
									text: "Status (Ongoing/Resolved)",
								},
							],
						},
						{
							type: "tableHeader",
							content: [{ type: "text", text: "Date Resolved" }],
						},
					],
				},
				// Placeholder Row - Add actual breach entries here
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[Unique ID, e.g., BR2024-001]",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "[YYYY-MM-DD HH:MM]" },
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[YYYY-MM-DD to YYYY-MM-DD or 'Unknown']",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[Description of how the breach occurred, systems involved, nature (confidentiality, integrity, availability)]",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[e.g., Contact details, Credentials, Financial data, Health information]",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "[Number or 'Unknown']" },
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[Assessment of potential harm, e.g., risk of identity theft, financial loss]",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[Containment steps, mitigation, recovery actions, preventative measures implemented]",
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "[Yes/No]" }],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[YYYY-MM-DD or Justification if 'No' (e.g., unlikely risk)]",
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "[Yes/No]" }],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[YYYY-MM-DD or Justification if 'No' (e.g., high risk unlikely, disproportionate effort, specific exception)]",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "[Ongoing/Resolved]" },
							],
						},
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "[YYYY-MM-DD or N/A]" },
							],
						},
					],
				},
				// Add more rows for subsequent breaches
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "3. Guidance Notes" }],
		},
		{
			type: "bulletList",
			attrs: { tight: true },
			content: [
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Recording Requirement:",
								},
								{
									type: "text",
									text: " All personal data breaches must be recorded, irrespective of the assessed risk level or whether notification obligations were triggered.",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Timeliness:",
								},
								{
									type: "text",
									text: " Entries should be made without undue delay after the breach has been identified and preliminary facts are established. The record should be updated as more information becomes available and remedial actions are taken.",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Sufficiency of Detail:",
								},
								{
									type: "text",
									text: " The information recorded must be sufficient to allow the Supervisory Authority to verify compliance with notification obligations under GDPR Article 33.",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Justification:",
								},
								{
									type: "text",
									text: " Where notification to the Supervisory Authority or data subjects was not made, clear justification based on the risk assessment and GDPR criteria (Art 33(1) and Art 34(3)) must be documented in the relevant columns.",
								},
							],
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "4. Roles and Responsibilities" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "[Data Protection Officer (DPO) / Designated Compliance Lead]:",
				},
				{
					type: "text",
					text: " Responsible for overseeing the maintenance of this register, ensuring its accuracy and completeness, and conducting periodic reviews.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "[Incident Response Team (IRT) / Relevant Personnel]:",
				},
				{
					type: "text",
					text: " Responsible for providing timely and accurate information regarding breach facts, effects, and remedial actions to the DPO/Designated Lead for inclusion in the register.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{ type: "text", text: "5. Register Review and Retention" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This register will be formally reviewed at least annually by the [DPO/Compliance Team] to ensure ongoing accuracy and identify any trends or systemic issues. Entries within the register should be retained in accordance with {{organization}}'s data retention policy and relevant legal requirements.",
				},
			],
		},
	],
} as const;
