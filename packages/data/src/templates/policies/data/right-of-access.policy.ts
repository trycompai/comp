import type { TemplatePolicy } from "../types";

export const rightOfAccessPolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "right_of_access",
		slug: "right-of-access-procedure",
		name: "Data Subject Access Request (DSAR) Procedure",
		description:
			"This procedure outlines the steps for handling requests from individuals exercising their right of access to their personal data under GDPR Article 15.",
		frequency: "yearly",
		department: "it",
	},
	content: [
		// Policy Information Header
		{
			type: "heading",
			attrs: { level: 1 },
			content: [
				{
					type: "text",
					text: "Data Subject Access Request (DSAR) Procedure",
				},
			],
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
							type: "tableHeader",
							content: [{ type: "text", text: "Organization" }],
						},
						{
							type: "tableHeader",
							content: [{ type: "text", text: "Last Review" }],
						},
						{
							type: "tableHeader",
							content: [
								{ type: "text", text: "Review Frequency" },
							],
						},
						{
							type: "tableHeader",
							content: [{ type: "text", text: "Approved By" }],
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
							content: [{ type: "text", text: "Annual" }],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[DPO/Legal Head/Relevant Authority]",
								},
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
		// Introduction and Purpose
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
					text: "This procedure outlines the process for responding to Data Subject Access Requests (DSARs) received by {{organization}}. The purpose is to ensure that individuals can exercise their right of access under Article 15 of the General Data Protection Regulation (GDPR) effectively and that {{organization}} complies with its legal obligations.",
				},
			],
		},
		// Scope
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "2. Scope" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This procedure applies to all personal data processed by {{organization}} and covers all DSARs received from data subjects (or their authorized representatives) whose personal data is processed by the company.",
				},
			],
		},
		// Definitions
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "3. Definitions" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Data Subject Access Request (DSAR):",
				},
				{
					type: "text",
					text: " A request made by a data subject to access their personal data held by {{organization}} and receive information about how it is processed.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Personal Data (GDPR Art 4(1)):",
				},
				{
					type: "text",
					text: ' Any information relating to an identified or identifiable natural person ("data subject").',
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Data Subject:",
				},
				{
					type: "text",
					text: " An identified or identifiable natural person.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Data Protection Officer (DPO):",
				},
				{
					type: "text",
					text: " The individual designated (if applicable) responsible for overseeing data protection compliance.",
				},
			],
		},
		// Procedure Steps
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "4. DSAR Handling Procedure" }],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.1. Receiving the Request" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Data subjects can submit DSARs through designated channels, such as [Specify channels, e.g., dedicated email address (privacy@{{organization}}.com), online portal, postal mail to registered address].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Requests received through other channels should be promptly forwarded to the [DPO/Designated Team, e.g., Legal or Privacy Team].",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "4.2. Logging and Acknowledging the Request",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "All DSARs must be logged upon receipt in the DSAR Register [Link or reference to the Register]. The log should include the date received, requester details, request summary, and deadline for response (one month from receipt).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Acknowledge receipt of the request to the data subject promptly, typically within [e.g., 5 working days]. The acknowledgement should confirm receipt and inform them of the response timeline and any potential need for identity verification.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{ type: "text", text: "4.3. Verifying Requester Identity" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Reasonable steps must be taken to verify the identity of the requester before processing the DSAR, especially if the request is made electronically or if there are doubts about the identity.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Request only the minimum information necessary for verification. Avoid asking for excessive personal data. Verification methods may include [e.g., asking for account details, recent activity, checking against existing records, requesting a copy of ID in specific circumstances].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The one-month response period starts upon receipt of the request, but can be paused while awaiting necessary identity verification.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{ type: "text", text: "4.4. Locating and Compiling Data" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The [DPO/Designated Team] will coordinate a search across all relevant systems and departments where the data subject's personal data might be stored. This includes [List examples relevant to a SaaS company, e.g., CRM, user database, support tickets, logs, marketing platforms, backups].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "All personal data relating to the identified data subject must be compiled.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.5. Reviewing the Data" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Review the compiled data to:",
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
									text: "Confirm it relates to the data subject.",
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
									text: "Identify any data belonging to third parties (which may need redaction or consent to disclose).",
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
									text: "Assess if any exemptions apply (e.g., legal privilege, confidential references, disproportionate effort). Exemptions must be applied carefully and documented.",
								},
							],
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.6. Preparing the Response" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The response must include:",
				},
			],
		},
		{
			type: "orderedList",
			attrs: { tight: true, start: 1 },
			content: [
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Confirmation of whether personal data concerning the data subject is being processed.",
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
									text: "A copy of the personal data undergoing processing.",
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
									text: "The following information (as per GDPR Art 15(1) and 15(2)):",
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
															text: "Purposes of processing.",
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
															text: "Categories of personal data concerned.",
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
															text: "Recipients or categories of recipients (especially in third countries).",
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
															text: "Envisaged retention period or criteria used to determine it.",
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
															text: "Existence of the right to request rectification, erasure, restriction, or objection.",
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
															text: "Right to lodge a complaint with a supervisory authority.",
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
															text: "Source of the data (if not collected directly from the data subject).",
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
															text: "Existence of automated decision-making, including profiling (and meaningful information about the logic involved, significance, and consequences).",
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
															text: "Safeguards applied if data is transferred to a third country.",
														},
													],
												},
											],
										},
									],
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
					text: "The information should be provided in a concise, transparent, intelligible, and easily accessible form, using clear and plain language.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If no personal data is held, inform the data subject accordingly.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.7. Delivering the Response" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Provide the response within one month of receiving the request (or from successful identity verification if applicable).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Deliver the response electronically (e.g., via secure email or portal) unless the data subject requests otherwise or made the request by non-electronic means.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The first copy of the data is generally provided free of charge. A reasonable fee based on administrative costs may be charged for further copies.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "4.8. Handling Extensions and Complex Requests",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The response period may be extended by up to two further months where necessary, considering the complexity and number of requests.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If an extension is needed, inform the data subject within the first month, explaining the reasons for the delay.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "4.9. Handling Unfounded or Excessive Requests",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If a request is manifestly unfounded or excessive (e.g., repetitive), {{organization}} may:",
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
									text: "Charge a reasonable fee considering administrative costs; OR",
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
									text: "Refuse to act on the request.",
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
					text: "The burden of demonstrating the manifestly unfounded or excessive character rests with {{organization}}. The data subject must be informed of the reason for the fee or refusal and their right to complain to the Supervisory Authority.",
				},
			],
		},
		// Roles and Responsibilities
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "5. Roles and Responsibilities" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Data Protection Officer (DPO) / Designated Team [e.g., Legal, Privacy]:",
				},
				{
					type: "text",
					text: " Oversee the DSAR process, log requests, coordinate data gathering, review data, prepare responses, ensure compliance, and handle complex cases or escalations.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "IT Department:",
				},
				{
					type: "text",
					text: " Assist in locating and retrieving data from relevant systems.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Relevant Department Heads/Data Owners:",
				},
				{
					type: "text",
					text: " Cooperate with the DPO/Designated Team to locate and provide relevant data within their remit.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "All Staff:",
				},
				{
					type: "text",
					text: " Forward any received DSARs to the appropriate channel immediately.",
				},
			],
		},
		// Record Keeping
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "6. Record Keeping" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "All DSARs, related correspondence, identity verification details, data provided, details of any fees charged or refusals, and reasons for delays must be documented and maintained in the DSAR Register for [Specify retention period, e.g., 2 years after request closure] or as per the data retention policy.",
				},
			],
		},
		// Policy Review
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "7. Policy Review" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This procedure will be reviewed at least annually by the [DPO/Legal Team] and updated as necessary to reflect changes in regulations, best practices, or business operations.",
				},
			],
		},
	],
} as const;
