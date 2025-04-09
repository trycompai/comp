"use client";

import type { QuestionData, CategoryData } from "../types/home.types";
import { QuestionRendererProps } from "../types/QuestionRenderer.types";
import { MultiSelectQuestion } from "./MultiSelectQuestion";
import { TextInputQuestion } from "./TextInputQuestion";
import { ActionBlock } from "./ActionBlock";
import { WizardLauncher } from "./WizardLauncher";

function renderQuestion(question: QuestionData) {
	switch (question.type) {
		case "multi-select":
			return (
				<MultiSelectQuestion
					title={question.title}
					description={question.description}
					options={question.options}
				/>
			);
		case "text":
			return (
				<TextInputQuestion
					title={question.title}
					description={question.description}
				/>
			);
		case "action-block":
			return (
				<ActionBlock
					id={question.id}
					title={question.title}
					description={question.description}
					buttonLabel={question.buttonLabel}
					buttonLink={question.buttonLink}
				/>
			);
		case "wizard-launcher":
			return (
				<WizardLauncher
					id={question.id}
					title={question.title}
					description={question.description}
					buttonLabel={question.buttonLabel}
					wizardId={question.wizardId}
				/>
			);
		default: {
			const _exhaustiveCheck: never = question;
			console.warn(
				`Unhandled question type: ${(_exhaustiveCheck as any)?.type}`,
			);
			return null;
		}
	}
}

export function QuestionRenderer({ categories }: QuestionRendererProps) {
	return (
		<>
			{categories.map((category, idx) => (
				<div key={category.title} className="mb-12">
					<h2 className="text-2xl font-semibold mb-2">
						{idx + 1}. {category.title}
					</h2>
					{category.description && (
						<p className="text-muted-foreground mb-6">{category.description}</p>
					)}

					{category.questions.map((question) => (
						<div key={question.title} className="mb-8">
							{renderQuestion(question)}
						</div>
					))}
				</div>
			))}
		</>
	);
}
