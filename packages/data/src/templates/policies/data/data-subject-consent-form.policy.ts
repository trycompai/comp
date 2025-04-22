import type { TemplatePolicy } from "../types";

export const dataSubjectConsentFormPolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "data_subject_consent_form",
		slug: "data-subject-consent-form",
		name: "Data Subject Consent Form",
		description:
			"A template for obtaining explicit consent from data subjects for processing personal data, including sensitive data, in compliance with GDPR Articles 6, 7, and 9.",
		frequency: "yearly",
		department: "admin",
	},
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [{ type: "text", text: "Data Subject Consent Form" }],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Consent Information" }],
		},
		{
			type: "table",
			content: [
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Organization (Data Controller)",
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Date Issued" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Version" }],
						},
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "Contact for Queries" },
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
								{ type: "text", text: "{{organization}}" },
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "{{date}}" }], // Date form is provided
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "1.0" }], // Version number
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[DPO/Legal Contact Email/Address]", // Specific contact
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
			content: [{ type: "text", text: "1. Introduction" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This form is provided by {{organization}} ('we', 'us', 'our'). We are committed to protecting your privacy and processing your personal data transparently and securely in compliance with the General Data Protection Regulation (GDPR).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We are asking for your consent to collect and process your personal data for the specific purpose(s) outlined below. Please read this form carefully before providing your consent.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "2. Purpose(s) of Data Processing",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We request your consent to process your personal data for the following specific purpose(s):",
				},
			],
		},
		{
			type: "bulletList", // Use bullet points for clarity
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
									text: "[Clearly describe Purpose 1, e.g., To provide you with access to our SaaS platform features.]",
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
									text: "[Clearly describe Purpose 2, e.g., To send you marketing communications about relevant products and services.]",
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
									text: "[Add more purposes as needed...]",
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
					text: "3. Categories of Personal Data Processed",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "With your consent, we intend to process the following categories of personal data:",
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
									text: "Standard Personal Data:",
								},
								{
									type: "text",
									text: " [List specific data, e.g., Name, Email Address, IP Address, Company Name, Usage Data].",
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
									text: "Special Categories of Personal Data (Sensitive Data, if applicable):",
								},
								{
									type: "text",
									text: " [List specific sensitive data requiring explicit consent under Art. 9, e.g., Health Information, Biometric Data - specify *why* this is needed for the purpose]. If none, state 'We do not intend to process special categories of personal data based on this consent.'",
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
			content: [{ type: "text", text: "4. Legal Basis for Processing" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The legal basis for processing the personal data listed above is your explicit consent, provided in accordance with GDPR Article 6(1)(a).",
				},
			],
		},
		{
			type: "paragraph", // Add this only if processing sensitive data
			content: [
				{
					type: "text",
					text: "For any special categories of personal data (sensitive data) listed, the legal basis is your explicit consent provided in accordance with GDPR Article 9(2)(a).",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "5. Your Rights" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Under GDPR, you have several rights regarding your personal data, including:",
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
									text: "The right to access your data.",
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
									text: "The right to rectification of inaccurate data.",
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
									text: "The right to erasure ('right to be forgotten').",
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
									text: "The right to restrict processing.",
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
									text: "The right to data portability.",
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
									text: "The right to object to processing.",
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
									text: "The right to withdraw consent at any time.",
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
					text: "To exercise any of these rights, please contact us at [DPO/Legal Contact Email/Address].",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "6. Withdrawal of Consent" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "You have the right to withdraw your consent at any time. Withdrawing consent is as easy as giving it. You can withdraw consent by [Clearly describe the method, e.g., clicking the unsubscribe link in emails, changing settings in your account profile, contacting us directly at [Specific Email/Link]].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Please note that withdrawing consent will not affect the lawfulness of any processing carried out before you withdrew your consent. Once consent is withdrawn, we will cease processing your data for the purpose(s) you originally consented to, unless we have another legitimate legal basis for doing so.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "7. Data Retention" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Your personal data will be retained only for as long as necessary to fulfill the purpose(s) stated above, or as required by law. For more details, please refer to our Data Retention Policy/Schedule available at [Link to Policy/Schedule or contact info].",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			// Adjust numbering if Data Transfers section is added
			content: [{ type: "text", text: "8. Declaration of Consent" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "By signing/checking below, I confirm that I have read and understood the information provided in this form regarding the processing of my personal data by {{organization}}.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "I hereby freely give my specific, informed, and unambiguous consent to the processing of my personal data for the purpose(s) described above.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "____________________________" }, // Placeholder for signature or digital confirmation marker
			],
		},
		{
			type: "paragraph",
			content: [{ type: "text", text: "Full Name: [Data Subject Name]" }],
		},
		{
			type: "paragraph",
			content: [{ type: "text", text: "Date: {{date}}" }], // Date consent given
		},
	],
} as const;
