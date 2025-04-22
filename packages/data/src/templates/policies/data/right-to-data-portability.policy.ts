import type { TemplatePolicy } from "../types";

export const rightToDataPortabilityPolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "right_to_data_portability",
		slug: "right-to-data-portability-policy",
		name: "Right to Data Portability Policy and Procedure",
		description:
			"Outlines the procedure for handling requests from data subjects to receive their personal data in a portable format or transmit it to another controller, in compliance with GDPR Article 20.",
		frequency: "yearly",
		department: "admin", // Or 'it' / 'legal' depending on company structure
	},
	content: [
		// Heading 1
		{
			type: "heading",
			attrs: { level: 1 },
			content: [
				{
					type: "text",
					text: "Right to Data Portability Policy and Procedure",
				},
			],
		},
		// Policy Information Table
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
									text: "[DPO/Compliance Lead/Relevant Authority]",
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Internal" }],
						},
					],
				},
			],
		},
		// 1. Introduction and Purpose
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
					text: "Article 20 of the General Data Protection Regulation (GDPR) grants data subjects the right to data portability. This allows individuals to receive personal data they have provided to a controller in a structured, commonly used, and machine-readable format, and to transmit that data to another controller without hindrance, where the processing is based on consent (Art 6(1)(a) or Art 9(2)(a)) or on a contract (Art 6(1)(b)), and the processing is carried out by automated means.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The purpose of this policy and procedure is to ensure that {{organization}} handles requests for data portability in a compliant, secure, and efficient manner, upholding the rights of data subjects.",
				},
			],
		},
		// 2. Scope
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
					text: "This procedure applies to all personal data processed by {{organization}} as a data controller where the processing is based on consent or contract and carried out by automated means. It covers all employees, contractors, and relevant third parties involved in handling data subject requests or managing systems containing such personal data.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This right applies only to data provided by the data subject (actively or observed, e.g., usage data), not to inferred or derived data created by {{organization}}.",
				},
			],
		},
		// 3. Definitions
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
					text: "Processing (GDPR Art 4(2)):",
				},
				{
					type: "text",
					text: " Any operation performed on personal data by automated means, such as collection, recording, organization, structuring, storage, adaptation or alteration, retrieval, consultation, use, disclosure by transmission, dissemination or otherwise making available, alignment or combination, restriction, erasure or destruction.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Controller (GDPR Art 4(7)):",
				},
				{
					type: "text",
					text: " The natural or legal person, public authority, agency or other body which, alone or jointly with others, determines the purposes and means of the processing of personal data.",
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
					text: " The identified or identifiable natural person to whom personal data relates.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Data Portability:",
				},
				{
					type: "text",
					text: " The right for data subjects to receive their personal data in a specific format and transmit it.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Structured, Commonly Used, and Machine-Readable Format:",
				},
				{
					type: "text",
					text: " Formats like CSV, JSON, XML that allow data to be easily processed by other systems.",
				},
			],
		},
		// 4. Procedure for Handling Data Portability Requests
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "4. Procedure for Handling Data Portability Requests",
				},
			],
		},
		// 4.1 Receiving the Request
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
					text: "Data subjects can exercise their right to data portability by submitting a request through [Specify channels, e.g., dedicated email address privacy@{{organization}}.com, customer account settings, specific web form].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The request should clearly identify the data subject. It may also specify whether they wish to receive the data themselves or have it transmitted directly to another controller (if technically feasible).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "All requests received must be logged promptly in the [Specify system, e.g., Data Subject Request Log].",
				},
			],
		},
		// 4.2 Verification of Identity
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.2. Verification of Identity" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} must take reasonable steps to verify the identity of the individual making the request before processing it. The level of verification should be proportionate to the nature of the data.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Verification methods may include [Specify methods, e.g., asking for information previously provided, using secure account login procedures, requesting a form of ID if necessary and proportionate].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If unable to verify identity, inform the requester promptly, explaining why and requesting additional information if possible.",
				},
			],
		},
		// 4.3 Assessing the Request
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.3. Assessing the Request" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Once identity is verified, the [Designated Role/Team, e.g., Privacy Team, DPO] will assess the request:",
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
									text: "Confirm the personal data in question relates to the data subject.",
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
									text: "Verify the legal basis for processing: Is it based on consent (Art 6(1)(a) or 9(2)(a)) or contract (Art 6(1)(b))?",
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
									text: "Confirm the processing is carried out by automated means.",
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
									text: "Determine the scope of data provided by the data subject that falls under the request.",
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
									text: "Assess if fulfilling the request adversely affects the rights and freedoms of others (e.g., contains personal data of third parties that cannot be easily redacted).",
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
									text: "Consider if the request is manifestly unfounded or excessive (GDPR Art 12(5)). If so, {{organization}} may refuse to act or charge a reasonable fee.",
								},
							],
						},
					],
				},
			],
		},
		// 4.4 Data Compilation and Formatting
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{ type: "text", text: "4.4. Data Compilation and Formatting" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If the request is valid, the [Responsible Team, e.g., IT Department, Engineering] will compile the relevant personal data provided by the data subject.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The data must be provided in a structured, commonly used, and machine-readable format. [Specify formats offered, e.g., JSON, CSV]. The choice of format should aim for interoperability.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Ensure that only the data subject's personal data is included, or that data pertaining to others is appropriately removed or anonymized if possible.",
				},
			],
		},
		// 4.5 Providing the Data
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.5. Providing the Data" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Timing:",
				},
				{
					type: "text",
					text: " The data must be provided without undue delay, and at the latest within one month of receipt of the request.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Extension:",
				},
				{
					type: "text",
					text: " This period may be extended by two further months where necessary, taking into account the complexity and number of requests. The data subject must be informed of any such extension within one month of receipt of the request, together with the reasons for the delay (GDPR Art 12(3)).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Delivery:",
				},
				{
					type: "text",
					text: " The data should be transmitted securely to the data subject using [Specify method, e.g., secure download link via email, direct download from user account].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Inform the data subject once the data is available.",
				},
			],
		},
		// 4.6 Transmission to Another Controller
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "4.6. Transmission to Another Controller",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Where the data subject requests direct transmission to another controller, {{organization}} must comply if technically feasible.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} is not obligated to adopt or maintain processing systems that are technically compatible with those of other controllers. Assessment of technical feasibility will be done on a case-by-case basis.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If direct transmission is not feasible, inform the data subject, providing the data directly to them instead.",
				},
			],
		},
		// 4.7 Refusing a Request
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.7. Refusing a Request" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "A request can be refused if:",
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
									text: "The conditions for data portability are not met (e.g., legal basis is not consent or contract, processing is not automated).",
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
									text: "The request is manifestly unfounded or excessive.",
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
									text: "Fulfilling the request would adversely affect the rights and freedoms of others.",
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
									text: "Identity cannot be verified.",
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
					text: "If the request is refused, the [Designated Role/Team] must inform the data subject without undue delay, and at the latest within one month, explaining the reasons for the refusal and informing them of their right to lodge a complaint with a supervisory authority and to seek a judicial remedy (GDPR Art 12(4)).",
				},
			],
		},
		// 5. Roles and Responsibilities
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
					text: "Data Subjects:",
				},
				{
					type: "text",
					text: " Responsible for providing accurate information when submitting a request and for cooperating with identity verification.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "[Customer Support / Designated Intake Channel]:",
				},
				{
					type: "text",
					text: " Responsible for receiving requests, initial logging, and potentially initial identity verification.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "[Privacy Team / DPO]:",
				},
				{
					type: "text",
					text: " Responsible for overseeing the process, assessing requests eligibility, coordinating verification, managing communication with data subjects, handling refusals, and advising on technical feasibility.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "[IT Department / Engineering Teams]:",
				},
				{
					type: "text",
					text: " Responsible for identifying, extracting, compiling, and formatting the relevant data in a machine-readable format, ensuring secure transmission, and assessing technical feasibility for direct transmission.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "[Legal Counsel]:",
				},
				{
					type: "text",
					text: " Provide advice on complex requests, refusals, legal interpretation, and potential impacts on the rights of others.",
				},
			],
		},
		// 6. Record Keeping
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
					text: "A record of all data portability requests must be maintained in the [Specify system, e.g., Data Subject Request Log]. This log should include:",
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
									text: "Date request received.",
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
									text: "Data subject identification details (and verification method).",
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
									text: "Assessment details (eligibility criteria met/not met).",
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
									text: "Date(s) of actions taken (compilation, delivery/transmission, communication).",
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
									text: "Format in which data was provided.",
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
									text: "Details of direct transmission (if applicable, including recipient controller).",
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
									text: "Information provided to the data subject.",
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
									text: "Justification if request was refused or deadline extended.",
								},
							],
						},
					],
				},
			],
		},
		// 7. Policy Review
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
					text: "This policy and procedure will be reviewed at least annually by the [DPO/Compliance Lead] and updated as necessary to reflect changes in legal requirements, business operations, technology, or best practices.",
				},
			],
		},
	],
} as const;
