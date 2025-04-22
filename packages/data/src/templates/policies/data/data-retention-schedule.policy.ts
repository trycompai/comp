import type { TemplatePolicy } from "../types";

export const dataRetentionSchedulePolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "data_retention_schedule",
		slug: "data-retention-schedule",
		name: "Data Retention Schedule",
		description:
			"This schedule details the retention periods for various categories of personal data processed by the organization, as required by GDPR Article 30.",
		frequency: "yearly",
		department: "it", // Or IT/Compliance/Legal
	},
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [{ type: "text", text: "Data Retention Schedule" }],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Policy Information" }],
		},
		{
			type: "table",
			content: [
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [{ type: "text", text: "Organization" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Effective Date" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Last Updated" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Contact" }],
						},
						{
							type: "tableCell",
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
							content: [{ type: "text", text: "{{date}}" }], // Effective Date
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "{{date}}" }], // Last Updated Date
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Data Protection Officer / Legal Department", // Or specific contact
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Internal" }], // Typically internal or restricted
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "1. Introduction and Purpose" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This Data Retention Schedule is maintained by {{organization}} ('we', 'us', 'our') in accordance with GDPR Article 30 (Records of processing activities) and complements our overall Data Retention Policy/Notice. It outlines the standard periods for which different categories of personal data are retained and the basis for these retention periods.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Retention periods are determined based on legal, regulatory, contractual, and legitimate business requirements. Data is retained for no longer than necessary for the purposes for which it was processed.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "2. Retention Schedule",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The following table details the retention periods for key data categories. Specific retention periods might be adjusted based on overriding legal obligations or specific contexts detailed in relevant privacy notices.",
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
							type: "tableCell",
							content: [{ type: "text", text: "Data Category" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Examples" }],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Standard Retention Period",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Basis for Retention / Deletion Trigger",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Customer Account & Contact Data",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Name, email, address, phone, company, login credentials, contract details.",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Duration of active contract/service + [X] years post-termination/inactivity.",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Contractual necessity, legitimate interest (account management, support), legal obligation (statutory limitation periods for claims). Deletion triggered after [X] years of inactivity post-contract.",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Customer Service & Support Records",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Support tickets, email correspondence, chat logs, call recordings (if applicable).",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Duration of active contract/service + [Y] years post-interaction.",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Legitimate interest (service improvement, dispute resolution), contractual necessity (providing support). Deletion triggered after [Y] years.",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Financial & Transaction Records",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Invoices, payment details (masked/tokenized), order history, tax information.",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "As required by applicable financial/tax law (e.g., [Z] years after the end of the financial year).",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Legal obligation (tax, accounting laws). Deletion triggered after statutory period expires.",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "System & Security Logs",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Access logs, audit trails, error logs, IP addresses.",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[A] months/days (rolling basis).",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Legitimate interest (security monitoring, troubleshooting, compliance), potential legal obligations. Automatic deletion/overwrite after [A] period.",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Marketing & Communication Data (Consent-Based)",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Email addresses for newsletters, marketing preferences, communication history.",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Until consent is withdrawn or data becomes inactive/outdated (e.g., after [B] years of no engagement).",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Consent. Deletion triggered by consent withdrawal or inactivity/periodic review.",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Employee Records",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Employment contracts, payroll data, performance reviews, HR files.",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Duration of employment + [C] years post-termination (as required by labor/tax laws and statutory limitations).",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Legal obligation (employment, tax laws), contractual necessity, defense of legal claims. Deletion triggered after statutory/policy period expires.",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Recruitment Data (Unsuccessful Applicants)",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "CVs, application forms, interview notes.",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[D] months after the recruitment process concludes, unless consent for longer retention (e.g., talent pool) is obtained.",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Legitimate interest (defense against discrimination claims), consent (for talent pool). Deletion triggered after [D] months or upon consent withdrawal.",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Backup Data",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Copies of operational data stored for disaster recovery.",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Typically shorter, rolling periods (e.g., [E] days/weeks), aligned with backup strategy and recovery point objectives. Not intended for primary data access.",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Legitimate interest (business continuity, disaster recovery). Subject to overwrite/deletion cycles based on backup policy.",
								},
							],
						},
					],
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "italic" }],
					text: "Note: [X], [Y], [Z], [A], [B], [C], [D], [E] represent specific timeframes defined by the organization based on detailed legal analysis, regulatory requirements, and business needs. These should be documented internally.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "3. Secure Disposal",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Upon expiry of the retention period, personal data will be securely disposed of (deleted or anonymized) in accordance with our data security policies and procedures.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "4. Review and Updates",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This Data Retention Schedule is reviewed at least annually and updated as necessary to reflect changes in legal obligations, business practices, or data processing activities. The 'Last Updated' date indicates the latest revision.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "5. Contact Information" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "For questions regarding this schedule or our data retention practices, please contact the Data Protection Officer / Legal Department at [DPO/Legal Contact Email/Address].",
				},
			],
		},
	],
} as const;
