import type { Policy } from "../types";

export const dataClassificationPolicy: Policy = {
	type: "doc",
	metadata: {
		id: "data_classification",
		slug: "data-classification-policy",
		name: "Data Classification Policy",
		description:
			"This policy establishes a framework for classifying data based on sensitivity and defines handling requirements for each classification level.",
		frequency: "yearly",
		department: "gov",
		usedBy: {
			soc2: ["C1.1", "C1.2", "C1.3"],
		},
	},
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [{ type: "text", text: "Data Classification Policy" }],
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
							content: [{ type: "text", text: "Last Review" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Review Frequency" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Approved By" }],
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
							content: [{ type: "text", text: "{{organization}}" }],
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
							content: [{ type: "text", text: "CISO" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Restricted" }],
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Purpose and Scope" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This policy establishes the criteria for classifying data into categories (e.g., Public, Internal, Confidential, Highly Sensitive) and specifies handling requirements for each category.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Policy" }],
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
									text: "All data must be classified at the time of creation or receipt.",
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
									text: "Classification levels must be defined with corresponding handling, storage, and disposal requirements.",
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
									text: "Access to confidential data must be restricted on a need-to-know basis.",
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
			content: [{ type: "text", text: "References" }],
		},
	],
};
