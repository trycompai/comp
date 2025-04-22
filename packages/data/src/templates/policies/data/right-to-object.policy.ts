import type { TemplatePolicy } from "../types";

export const rightToObjectPolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "right_to_object",
		slug: "right-to-object-policy",
		name: "Right to Object Policy and Procedure",
		description:
			"Outlines the procedure for handling requests from data subjects to object to the processing of their personal data, in compliance with GDPR Article 21.",
		frequency: "yearly",
		department: "admin", // Or 'legal' depending on company structure
	},
	content: [
		// Heading 1
		{
			type: "heading",
			attrs: { level: 1 },
			content: [
				{
					type: "text",
					text: "Right to Object Policy and Procedure",
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
					text: "Article 21 of the General Data Protection Regulation (GDPR) grants data subjects the right to object, on grounds relating to their particular situation, to the processing of personal data concerning them which is based on point (e) (public task) or (f) (legitimate interests) of Article 6(1). Data subjects also have an absolute right to object to processing for direct marketing purposes.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The purpose of this policy and procedure is to ensure that {{organization}} handles objections in a compliant, timely, and consistent manner, respecting the rights of data subjects.",
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
					text: "This procedure applies to all personal data processed by {{organization}} as a data controller where the processing is based on legitimate interests (Art 6(1)(f)), public task (Art 6(1)(e)), or for direct marketing purposes. It covers all employees, contractors, and relevant third parties involved in handling data subject requests or data processing activities.",
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
					text: " Any operation performed on personal data, such as collection, recording, organization, structuring, storage, adaptation or alteration, retrieval, consultation, use, disclosure by transmission, dissemination or otherwise making available, alignment or combination, restriction, erasure or destruction.",
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
					text: "Objection:",
				},
				{
					type: "text",
					text: " A data subject's formal expression of opposition to the processing of their personal data under specific circumstances.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Legitimate Interests (GDPR Art 6(1)(f)):",
				},
				{
					type: "text",
					text: " Processing necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Direct Marketing:",
				},
				{
					type: "text",
					text: " Communication of any advertising or marketing material directed to particular individuals.",
				},
			],
		},
		// 4. Procedure for Handling Objections
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{ type: "text", text: "4. Procedure for Handling Objections" },
			],
		},
		// 4.1 Receiving the Objection
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.1. Receiving the Objection" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Data subjects can exercise their right to object by submitting a request through [Specify channels, e.g., dedicated email address privacy@{{organization}}.com, unsubscribe links in marketing emails, customer account settings, specific web form].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Objections related to processing based on legitimate interests or public task (Art 6(1)(e) or (f)) must include grounds relating to the data subject's particular situation.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Objections related to direct marketing do not require justification.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "All objections received must be logged promptly in the [Specify system, e.g., Data Subject Request Log / Marketing Suppression List].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Data subjects must be informed of their right to object explicitly and separately from other information, at the latest at the time of the first communication.",
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
					text: "{{organization}} must take reasonable steps to verify the identity of the individual making the objection before processing it, particularly for objections not related to direct marketing. The level of verification should be proportionate.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Verification methods may include [Specify methods, e.g., asking for information previously provided, using secure account login procedures]. ID may not be necessary unless reasonable doubts exist.",
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
		// 4.3 Assessing the Objection
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.3. Assessing the Objection" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Once identity is verified (if necessary), the [Designated Role/Team, e.g., Privacy Team, DPO, Marketing Team] will assess the objection:",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 4 },
			content: [
				{
					type: "text",
					text: "4.3.1 Objection to Processing based on Legitimate Interests / Public Task (Art 6(1)(e) or (f))",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} must stop processing the personal data unless it can demonstrate compelling legitimate grounds for the processing which override the interests, rights, and freedoms of the data subject, or for the establishment, exercise or defense of legal claims.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The assessment involves balancing the organization's legitimate interests against the data subject's specific situation and grounds for objection.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Consultation with [Legal Counsel/DPO] may be required.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 4 },
			content: [
				{
					type: "text",
					text: "4.3.2 Objection to Processing for Direct Marketing Purposes",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This is an absolute right. If a data subject objects to processing for direct marketing purposes (including profiling related to direct marketing), the personal data shall no longer be processed for such purposes.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "No balancing test is required.",
				},
			],
		},
		// 4.4 Acting on the Objection
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.4. Acting on the Objection" }],
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
					text: " Action must be taken without undue delay, and at the latest within one month of receipt of the request.",
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
					text: "Action:",
				},
				{
					type: "text",
					text: " If the objection is upheld (mandatory for direct marketing, or if legitimate grounds do not override for other processing), the [Responsible Team, e.g., IT, Marketing, Engineering] will:",
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
									text: "Cease the specific processing activities objected to.",
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
									text: "For direct marketing, ensure the data subject is added to a suppression list to prevent future marketing communications.",
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
									text: "Note: Stopping processing based on objection does not automatically mean the data must be erased unless requested under Article 17 (Right to Erasure) and conditions are met.",
								},
							],
						},
					],
				},
			],
		},
		// 4.5 Informing the Data Subject
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{ type: "text", text: "4.5. Informing the Data Subject" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The [Designated Role/Team] must inform the data subject about the action taken in response to their objection (or the reasons for not taking action) without undue delay, and at the latest within one month (or the extended period).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If the objection is upheld, confirm that the processing has ceased.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If the objection related to legitimate interests/public task is overridden, explain the compelling legitimate grounds.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "In all cases where the request is refused or overridden, inform the data subject of their right to lodge a complaint with a supervisory authority and to seek a judicial remedy (GDPR Art 12(4)).",
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
					text: " Responsible for submitting objections through designated channels and providing grounds for objection where required.",
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
					text: " Responsible for receiving objections, initial logging, routing to the appropriate team, and potentially initial identity verification.",
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
					text: " Responsible for overseeing the process, assessing objections related to legitimate interests/public task, coordinating verification, managing communication with data subjects, and advising on compliance.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "[Marketing Team]:",
				},
				{
					type: "text",
					text: " Responsible for handling objections to direct marketing, ensuring prompt cessation of marketing communications, and managing suppression lists.",
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
					text: " Responsible for technically implementing the cessation of processing or suppression upon instruction.",
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
					text: " Provide advice on complex objections, assessment of compelling legitimate grounds, and legal interpretation.",
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
					text: "A record of all objections must be maintained in the [Specify system, e.g., Data Subject Request Log / Suppression List]. This log should include:",
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
									text: "Date objection received.",
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
									text: "Data subject identification details (and verification method, if used).",
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
									text: "Type of objection (direct marketing or other processing).",
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
									text: "Grounds provided by the data subject (if applicable).",
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
									text: "Date(s) of actions taken (assessment, cessation/suppression, communication).",
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
									text: "Justification if objection was overridden or deadline extended.",
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
					text: "This policy and procedure will be reviewed at least annually by the [DPO/Compliance Lead] and updated as necessary to reflect changes in legal requirements, business operations, processing activities, or best practices.",
				},
			],
		},
	],
} as const;
