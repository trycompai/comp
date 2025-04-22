import type { TemplatePolicy } from "../types";

export const rightToRestrictionPolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "right_to_restriction",
		slug: "right-to-restriction-policy",
		name: "Right to Restriction of Processing Policy and Procedure",
		description:
			"Outlines the procedure for handling requests from data subjects to restrict the processing of their personal data, in compliance with GDPR Article 18.",
		frequency: "yearly",
		department: "admin", // Or 'legal' / 'privacy'
	},
	content: [
		// Heading 1
		{
			type: "heading",
			attrs: { level: 1 },
			content: [
				{
					type: "text",
					text: "Right to Restriction of Processing Policy and Procedure",
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
					text: "Article 18 of the General Data Protection Regulation (GDPR) grants data subjects the right to obtain from the controller restriction of processing of their personal data under certain circumstances. When processing is restricted, such personal data shall, with the exception of storage, only be processed with the data subject's consent or for specific legal reasons.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The purpose of this policy and procedure is to ensure that {{organization}} handles requests for restriction of processing in a compliant, secure, and efficient manner, respecting the rights of data subjects.",
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
					text: "This procedure applies to all personal data processed by {{organization}} as a data controller and covers all employees, contractors, and relevant third parties involved in handling data subject requests or managing systems containing personal data.",
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
					text: " Any operation performed on personal data.",
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
					text: " Determines the purposes and means of processing.",
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
					text: " The individual to whom personal data relates.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Restriction of Processing (GDPR Art 4(3)):",
				},
				{
					type: "text",
					text: " The marking of stored personal data with the aim of limiting their processing in the future.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Recipient (GDPR Art 4(9)):",
				},
				{
					type: "text",
					text: " A natural or legal person, public authority, agency or another body, to which the personal data are disclosed.",
				},
			],
		},
		// 4. Grounds for Restriction (Art 18(1))
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "4. Grounds for Restriction" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The data subject has the right to obtain restriction of processing where one of the following applies (Article 18(1)):",
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
									text: "a) The accuracy of the personal data is contested by the data subject, for a period enabling the controller to verify the accuracy of the personal data.",
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
									text: "b) The processing is unlawful and the data subject opposes the erasure of the personal data and requests the restriction of their use instead.",
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
									text: "c) The controller no longer needs the personal data for the purposes of the processing, but they are required by the data subject for the establishment, exercise or defence of legal claims.",
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
									text: "d) The data subject has objected to processing pursuant to Article 21(1) pending the verification whether the legitimate grounds of the controller override those of the data subject.",
								},
							],
						},
					],
				},
			],
		},
		// 5. Effects of Restriction (Art 18(2))
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "5. Effects of Restriction" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Where processing has been restricted, such personal data shall, with the exception of storage, only be processed:",
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
									text: "With the data subject's consent;",
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
									text: "For the establishment, exercise or defence of legal claims;",
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
									text: "For the protection of the rights of another natural or legal person; or",
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
									text: "For reasons of important public interest of the Union or of a Member State.",
								},
							],
						},
					],
				},
			],
		},
		// 6. Procedure for Handling Restriction Requests
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "6. Procedure for Handling Restriction Requests",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "6.1. Receiving the Request" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Data subjects can exercise their right to restriction by submitting a request through [Specify channels, e.g., dedicated email address privacy@{{organization}}.com, customer portal, specific web form].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The request should clearly identify the data subject and the specific grounds for requesting restriction.",
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
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "6.2. Verification of Identity" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} must take reasonable steps to verify the identity of the individual making the request before processing it.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Verification methods may include [Specify methods]. Only request minimum information needed.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If unable to verify identity, inform the requester promptly.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "6.3. Assessing the Request" }],
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
									text: "Locate the relevant personal data.",
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
									text: "Determine if any of the grounds for restriction listed in Section 4 apply.",
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
									text: "Consider if the request is manifestly unfounded or excessive (GDPR Art 12(5)).",
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
			content: [
				{
					type: "text",
					text: "6.4. Implementing Restriction",
				},
			],
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
					text: " Restriction must be implemented without undue delay, and at the latest within one month of receipt of the request (subject to identity verification).",
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
					text: " This period may be extended by two further months where necessary (complexity/number of requests). The data subject must be informed of the extension and reasons within one month.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Action:",
				},
				{
					type: "text",
					text: " If the request is valid, the [Responsible Team, e.g., IT Department, Engineering] will implement technical and/or organizational measures to restrict processing. Methods may include:",
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
									text: "Temporarily moving the selected data to another processing system.",
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
									text: "Making the selected data unavailable to users.",
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
									text: "Temporarily removing published data from a website.",
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
									text: "Using flags or markers in the system to indicate restricted data.",
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
					text: "The fact that processing is restricted should be clearly indicated in the system.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "6.5. Communication to Recipients (GDPR Art 19)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} must communicate any restriction of processing carried out to each recipient to whom the personal data have been disclosed, unless this proves impossible or involves disproportionate effort.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The [Designated Role/Team] will identify relevant recipients and notify them.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} shall inform the data subject about those recipients if the data subject requests it.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{ type: "text", text: "6.6. Informing the Data Subject" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Once restriction is implemented (or if the request is refused), the [Designated Role/Team] must inform the data subject without undue delay, and at the latest within one month (or the extended period).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The communication should confirm that processing has been restricted and explain the effects.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If the request is refused (e.g., grounds not met, unfounded/excessive), explain the reasons and inform the data subject of their right to lodge a complaint with a supervisory authority and to seek a judicial remedy (GDPR Art 12(4)).",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "6.7. Lifting the Restriction (Art 18(3))",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Before the restriction of processing is lifted (e.g., accuracy verified, legal claim concluded), {{organization}} must inform the data subject.",
				},
			],
		},
		// Roles and Responsibilities Section
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "7. Roles and Responsibilities" }],
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
					text: " Responsible for submitting requests and cooperating with verification.",
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
					text: " Responsible for receiving requests, logging, routing.",
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
					text: " Responsible for overseeing, assessing requests, coordinating implementation and lifting of restrictions, managing communications.",
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
					text: " Responsible for technically implementing and lifting restrictions in relevant systems upon instruction.",
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
					text: " Provide advice on complex requests, legal grounds, and interpretation.",
				},
			],
		},
		// Record Keeping Section
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "8. Record Keeping" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "A record of all restriction requests must be maintained in the [Specify system, e.g., Data Subject Request Log]. This log should include details of the request, verification, assessment (grounds met/not met), action taken (implementation/lifting dates), communications with recipients, and communication with the data subject, including justifications for refusals or extensions.",
				},
			],
		},
		// Policy Review Section
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "9. Policy Review" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This policy and procedure will be reviewed at least annually by the [DPO/Compliance Lead] and updated as necessary.",
				},
			],
		},
	],
} as const;
