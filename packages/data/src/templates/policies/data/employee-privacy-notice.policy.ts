import type { TemplatePolicy } from "../types";

export const employeePrivacyNoticePolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "employee_privacy_notice",
		slug: "employee-privacy-notice",
		name: "Employee Privacy Notice",
		description:
			"This notice explains how we collect, use, and protect the personal data of our employees, workers, and contractors in compliance with GDPR Articles 12, 13, and 14.",
		frequency: "yearly",
		department: "hr",
	},
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [{ type: "text", text: "Employee Privacy Notice" }],
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
									text: "HR Department / Data Protection Officer", // Or specific contact email
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Confidential" }], // Usually confidential for internal use
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
					text: "{{organization}} ('we', 'us', 'our') is committed to protecting the privacy and security of your personal data. This Employee Privacy Notice describes how we collect and use personal data about you during and after your working relationship with us, in accordance with the General Data Protection Regulation (GDPR) and other applicable data protection laws.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This notice applies to current and former employees, workers, and contractors. It addresses the requirements of GDPR Articles 12 (Transparent Information), 13 (Information collected from the data subject), and 14 (Information not obtained from the data subject).",
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
					text: "The data controller responsible for your personal data is {{organization}}, located at [Your Company Address]. You can contact our Data Protection Officer (DPO) or the HR Department for privacy-related questions at [HR/DPO Contact Email/Address].",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{ type: "text", text: "3. Information We Collect About You" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We collect and process a range of personal data about you. This includes:",
				},
			],
		},
		{
			type: "orderedList",
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
									text: "Data You Provide Directly (Art. 13):",
								},
								{
									type: "text",
									text: " Information you provide during the recruitment process, onboarding, and throughout your employment.",
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
															text: "Personal Contact Details: Name, title, addresses, telephone numbers, and personal email addresses.",
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
															text: "Identification Data: Date of birth, gender, marital status, dependents, next of kin, emergency contact information.",
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
															text: "Recruitment Information: CVs, cover letters, references, qualifications, right-to-work documentation.",
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
															text: "Employment Records: Job titles, work history, working hours, training records, performance information, disciplinary and grievance information.",
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
															text: "Compensation and Benefits Information: Salary, bank account details, payroll records, tax status information, pension and benefits information.",
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
															text: "Leave Information: Holiday records, sickness absence records (including potentially sensitive health data where necessary and legally permitted).",
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
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Data Collected Automatically:",
								},
								{
									type: "text",
									text: " Information collected through your use of company systems and premises.",
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
															text: "IT System Usage: Information about your use of our information and communication systems (e.g., login data, access logs, email usage, internet access data) as permitted by law and relevant policies (e.g., Acceptable Use Policy).",
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
															text: "Security Monitoring: Information gathered through security systems (e.g., CCTV footage in specific areas for security purposes, access control records).",
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
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Data Obtained from Third Parties (Art. 14):",
								},
								{
									type: "text",
									text: " Information from other sources.",
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
															text: "Recruitment Agencies: Information provided during the hiring process.",
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
															text: "Background Check Providers: Information obtained during pre-employment screening (where applicable and legally permitted, with your consent).",
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
															text: "Former Employers: References provided by former employers.",
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
															text: "Public Sources: Information from publicly available sources (e.g., LinkedIn for recruitment/verification).",
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
															text: "Government Agencies: Information related to tax or social security.",
														},
													],
												},
											],
										},
									],
								},
								{
									type: "text",
									text: " When we obtain personal data about you from third parties, we will provide you with the information required under GDPR Article 14 (e.g., source, categories of data) unless an exception applies (e.g., providing the information is impossible, involves disproportionate effort, or is subject to legal/professional secrecy obligations).",
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
									text: "Special Categories of Personal Data:",
								},
								{
									type: "text",
									text: " We may also collect, store, and use 'special categories' of more sensitive personal data where necessary and legally permitted (e.g., information about health for sick pay or reasonable adjustments, race/ethnic origin for equality monitoring). We will ensure additional safeguards and specific legal bases apply to such processing.",
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
					text: "4. How We Use Your Personal Data (Purposes of Processing)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We use your personal data for purposes necessary for the performance of our employment contract with you, to comply with legal obligations, and for our legitimate interests. These purposes include:",
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
									text: "Making recruitment decisions and determining terms of engagement.",
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
									text: "Administering the employment contract, including payroll, benefits, and pensions.",
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
									text: "Business management and planning, including accounting and auditing.",
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
									text: "Conducting performance reviews, managing performance, and determining performance requirements.",
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
									text: "Making decisions about salary reviews and compensation.",
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
									text: "Assessing qualifications for a particular job or task, including decisions about promotions.",
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
									text: "Gathering evidence for grievance or disciplinary hearings.",
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
									text: "Making decisions about your continued employment or engagement.",
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
									text: "Arranging cessation of the working relationship.",
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
									text: "Education, training, and development requirements.",
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
									text: "Dealing with legal disputes involving you, or other employees, workers, and contractors.",
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
									text: "Complying with health and safety obligations.",
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
									text: "Preventing fraud.",
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
									text: "Monitoring your use of our information and communication systems to ensure compliance with our IT policies (subject to applicable laws).",
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
									text: "Ensuring network and information security.",
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
									text: "Equal opportunities monitoring.",
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
			content: [{ type: "text", text: "5. Legal Basis for Processing" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We process your personal data based on the following legal grounds under GDPR:",
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
									text: "Contractual Necessity (Art. 6(1)(b)):",
								},
								{
									type: "text",
									text: " Processing necessary to perform the employment contract between you and us.",
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
									text: "Legal Obligation (Art. 6(1)(c)):",
								},
								{
									type: "text",
									text: " Processing necessary to comply with our legal or regulatory obligations (e.g., tax, social security, health and safety, right-to-work checks).",
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
									text: "Legitimate Interests (Art. 6(1)(f)):",
								},
								{
									type: "text",
									text: " Processing necessary for our legitimate interests (or those of a third party), such as running our business efficiently, managing our workforce, ensuring security, and preventing fraud, provided these interests are not overridden by your fundamental rights and freedoms.",
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
									text: "Consent (Art. 6(1)(a)):",
								},
								{
									type: "text",
									text: " In limited circumstances, we may rely on your explicit consent for specific processing activities (e.g., certain types of background checks, using your image for marketing). You have the right to withdraw consent at any time.",
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
									text: "Processing Special Categories of Data (Art. 9):",
								},
								{
									type: "text",
									text: " We process special categories of data (e.g., health data) primarily based on legal obligations in employment law (Art. 9(2)(b)), for assessing working capacity (Art. 9(2)(h)), or with your explicit consent (Art. 9(2)(a)) where appropriate.",
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
			content: [{ type: "text", text: "6. Data Sharing and Disclosure" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We may need to share your personal data internally (e.g., with HR, managers, IT staff if access is necessary for their roles) and with third parties. This may include:",
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
									text: "Service Providers (Processors):",
								},
								{
									type: "text",
									text: " Third-party service providers who perform functions on our behalf, such as payroll providers, benefits administration providers, IT service providers, cloud hosting providers, background check agencies (where applicable). They are required to respect the security of your data and treat it in accordance with the law.",
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
									text: "Other Third Parties:",
								},
								{
									type: "text",
									text: " Professional advisors (e.g., lawyers, accountants, auditors), regulatory bodies (e.g., tax authorities), government agencies, law enforcement.",
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
									text: "Business Transfers:",
								},
								{
									type: "text",
									text: " In connection with a merger, acquisition, reorganization, or sale of assets, your data may be transferred.",
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
				{ type: "text", text: "7. International Data Transfers" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Some of our third-party service providers may be based outside the European Economic Area (EEA). If we transfer your personal data out of the EEA, we ensure a similar degree of protection is afforded to it by ensuring at least one of the following safeguards is implemented:",
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
									text: "Transfers to countries deemed adequate by the European Commission.",
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
									text: "Use of specific contracts approved by the European Commission (Standard Contractual Clauses - SCCs).",
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
									text: "Other valid transfer mechanisms permitted under GDPR.",
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
					text: "Please contact us if you want further information on the specific mechanism used when transferring your personal data out of the EEA.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "8. Data Retention" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We will only retain your personal data for as long as necessary to fulfil the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements. Generally, we will retain HR records for the duration of your employment plus a period of [Specify Period, e.g., 6 years] after termination, subject to legal or regulatory requirements.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Retention periods may vary depending on the type of data and the specific legal context. For example, recruitment information for unsuccessful candidates may be held for a shorter period (e.g., [Specify Period, e.g., 6 months]).",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "9. Your Data Protection Rights" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Under GDPR, you have several rights regarding your personal data:",
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
									text: "Right of Access:",
								},
								{
									type: "text",
									text: " Request a copy of the personal data we hold about you.",
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
									text: "Right to Rectification:",
								},
								{
									type: "text",
									text: " Request correction of inaccurate or incomplete data.",
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
									text: "Right to Erasure ('Right to be Forgotten'):",
								},
								{
									type: "text",
									text: " Request deletion of your personal data where there is no good reason for us continuing to process it.",
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
									text: "Right to Restriction of Processing:",
								},
								{
									type: "text",
									text: " Request suspension of the processing of your personal data in certain circumstances.",
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
									text: "Right to Data Portability:",
								},
								{
									type: "text",
									text: " Request the transfer of your personal data to you or a third party in a structured, commonly used, machine-readable format (applies to data processed based on consent or contract).",
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
									text: "Right to Object:",
								},
								{
									type: "text",
									text: " Object to processing based on legitimate interests (or for direct marketing).",
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
									text: "Right to Withdraw Consent:",
								},
								{
									type: "text",
									text: " Withdraw consent at any time where processing is based on consent.",
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
					text: "To exercise any of these rights, please contact the HR Department or DPO using the details in Section 2. We may need to request specific information from you to help us confirm your identity.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "You also have the right to lodge a complaint with the relevant supervisory authority for data protection issues (e.g., the Information Commissioner's Office (ICO) in the UK, or the equivalent authority in your EU member state).",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "10. Data Security" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We have put in place appropriate technical and organizational security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. Access to your personal data is limited to those employees, agents, contractors and other third parties who have a business need to know. They will only process your personal data on our instructions and they are subject to a duty of confidentiality. We have procedures to deal with any suspected data security breach and will notify you and any applicable regulator of a suspected breach where we are legally required to do so.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{ type: "text", text: "11. Changes to this Privacy Notice" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We reserve the right to update this privacy notice at any time. We will provide you with a new privacy notice when we make any substantial updates. We may also notify you in other ways from time to time about the processing of your personal data.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "12. Contact Information" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If you have any questions about this privacy notice or how we handle your personal data, please contact the HR Department or the Data Protection Officer (DPO) at:",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "{{organization}}" },
				{ type: "hardBreak" },
				{ type: "text", text: "[Your Company Address]" },
				{ type: "hardBreak" },
				{ type: "text", text: "[HR/DPO Contact Email/Address]" },
			],
		},
	],
} as const;
