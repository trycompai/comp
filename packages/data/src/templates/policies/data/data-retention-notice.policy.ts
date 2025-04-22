import type { TemplatePolicy } from "../types";

export const dataRetentionNoticePolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "data_retention_notice",
		slug: "data-retention-notice",
		name: "Data Retention Notice",
		description:
			"This notice explains how long we retain personal data, the reasons for retention, and your rights regarding data erasure, in compliance with GDPR Articles 5, 13, 17, and 30.",
		frequency: "yearly",
		department: "it", // Or IT/Compliance
	},
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [{ type: "text", text: "Data Retention Notice" }],
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
							content: [{ type: "text", text: "Public" }], // Or Internal/Confidential depending on audience
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "1. Introduction" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} ('we', 'us', 'our') is committed to processing personal data responsibly and transparently. This Data Retention Notice explains our policies regarding how long we keep your personal data, the criteria used to determine these periods, and your rights under the General Data Protection Regulation (GDPR), specifically addressing requirements from Articles 5 (Principles relating to processing), 13 (Information to be provided), 17 (Right to erasure), and 30 (Records of processing activities).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This notice applies to all personal data processed by us, including data from customers, employees, contractors, and website visitors.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "2. Data Controller Information" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The data controller responsible for your personal data is {{organization}}, located at [Your Company Address]. You can contact our Data Protection Officer (DPO) or Legal Department for questions regarding this notice or your data privacy rights at [DPO/Legal Contact Email/Address].",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "3. Principles of Data Retention (GDPR Art. 5)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Our data retention practices are guided by the core principles of the GDPR:",
				},
			],
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
									text: "Purpose Limitation:",
								},
								{
									type: "text",
									text: " Personal data is collected for specified, explicit, and legitimate purposes and not further processed in a manner incompatible with those purposes.",
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
									text: "Data Minimisation:",
								},
								{
									type: "text",
									text: " We only process personal data that is adequate, relevant, and limited to what is necessary in relation to the purposes for which it is processed.",
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
									text: "Storage Limitation:",
								},
								{
									type: "text",
									text: " Personal data is kept in a form which permits identification of data subjects for no longer than is necessary for the purposes for which the personal data is processed. Longer retention periods may apply for archiving purposes in the public interest, scientific or historical research purposes, or statistical purposes, subject to appropriate safeguards.",
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
									text: "Integrity and Confidentiality:",
								},
								{
									type: "text",
									text: " Personal data is processed in a manner that ensures appropriate security, including protection against unauthorised or unlawful processing and against accidental loss, destruction, or damage, using appropriate technical or organisational measures.",
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
			content: [
				{
					type: "text",
					text: "4. Information on Retention Periods (GDPR Art. 13)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "As required by GDPR Article 13, when we collect your personal data, we provide information about the period for which the personal data will be stored, or if that is not possible, the criteria used to determine that period. This information is typically provided in specific privacy notices relevant to the context of data collection (e.g., Customer Privacy Notice, Employee Privacy Notice).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Retention periods are determined based on:",
				},
			],
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
									text: "The purpose for which the data was collected.",
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
									text: "Legal and regulatory requirements (e.g., tax laws, employment laws, industry regulations).",
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
									text: "Contractual obligations.",
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
									text: "Business needs (e.g., maintaining service history, managing accounts, defending legal claims).",
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
									text: "Statutory limitation periods for potential legal claims.",
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
			content: [
				{
					type: "text",
					text: "5. Right to Erasure ('Right to be Forgotten') (GDPR Art. 17)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "You have the right to request the erasure of your personal data without undue delay under certain circumstances, as outlined in GDPR Article 17. These include situations where:",
				},
			],
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
									text: "The personal data is no longer necessary for the purpose for which it was collected.",
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
									text: "You withdraw consent on which the processing is based, and there is no other legal ground for processing.",
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
									text: "You object to the processing pursuant to Article 21(1) and there are no overriding legitimate grounds, or you object pursuant to Article 21(2) (direct marketing).",
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
									text: "The personal data has been unlawfully processed.",
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
									text: "The personal data must be erased for compliance with a legal obligation.",
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
					text: "However, the right to erasure is not absolute. We may be required to retain certain data to comply with legal obligations, for the establishment, exercise, or defence of legal claims, or for other reasons permitted by the GDPR.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If you request erasure, we will assess whether any exceptions apply. If data can be erased, we will do so securely and confirm completion. If we cannot erase the data due to an exception, we will inform you of the reason.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "6. Records of Processing Activities (GDPR Art. 30)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "As required by GDPR Article 30, {{organization}} maintains internal records of its data processing activities. These records include, where applicable:",
				},
			],
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
									text: "The purposes of the processing.",
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
									text: "A description of the categories of data subjects and personal data.",
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
									text: "The categories of recipients to whom data has been or will be disclosed.",
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
									text: "The envisaged time limits for erasure of the different categories of data (our retention schedules).",
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
									text: "A general description of the technical and organisational security measures.",
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
					text: "These records help us manage data processing effectively and demonstrate compliance, including adherence to our retention policies.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "7. General Retention Schedules Overview",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Below is a general overview of retention periods for common categories of data. Specific retention periods may vary and are detailed in our internal Records of Processing Activities (RoPA) and relevant specific privacy notices.",
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
							content: [
								{
									type: "text",
									text: "General Retention Guideline",
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Basis" }],
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
									text: "Customer Account Data (Active)",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Duration of customer relationship/contract",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Contractual necessity, business need",
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
									text: "Customer Account Data (Inactive)",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Defined period after last activity or contract termination + statutory limitation periods (e.g., [X] years)",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Legal obligations, defense of legal claims, business need",
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
									text: "As required by financial/tax law (e.g., [Y] years)",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "Legal obligation" },
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
								{ type: "text", text: "Employee Records" },
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Duration of employment + period required by employment/tax law and statutory limitation periods (e.g., [Z] years post-termination)",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Legal obligation, contractual necessity, defense of legal claims",
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
									text: "Short period after recruitment process (e.g., [e.g., 6 months]), unless consent for longer retention is obtained.",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Legitimate interest (defense against discrimination claims), consent",
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
									text: "System Logs / Audit Trails",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Defined period based on security needs and regulations (e.g., [e.g., 12 months])",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Legitimate interest (security), legal/regulatory obligation",
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
									text: "Marketing Data (Consent-Based)",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Until consent is withdrawn or data becomes outdated/irrelevant.",
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Consent" }],
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
					text: "Note: [X], [Y], [Z], etc., represent specific timeframes defined by the organization based on legal analysis and business requirements.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{ type: "text", text: "8. Secure Deletion and Anonymization" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "When personal data reaches the end of its retention period, or upon a valid erasure request, we will securely delete or anonymize it in accordance with our data handling procedures and applicable standards. Anonymization means altering the data so that individuals can no longer be identified from it.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "9. Your Rights" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "In addition to the Right to Erasure (Article 17), you have other rights regarding your personal data, including the right to access, rectify, restrict processing, and data portability. Please refer to our main Privacy Policy or contact our DPO/Legal Department for more information on how to exercise your rights.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "10. Changes to this Notice" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We may update this Data Retention Notice periodically to reflect changes in legal requirements or our data handling practices. We encourage you to review this notice regularly. Significant changes will be communicated through appropriate channels.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "11. Contact Information" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "For any questions about this notice or our data retention practices, please contact:",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Data Protection Officer / Legal Department",
				},
				{ type: "hardBreak" },
				{ type: "text", text: "{{organization}}" },
				{ type: "hardBreak" },
				{ type: "text", text: "[Your Company Address]" },
				{ type: "hardBreak" },
				{ type: "text", text: "[DPO/Legal Contact Email/Address]" },
			],
		},
	],
} as const;
