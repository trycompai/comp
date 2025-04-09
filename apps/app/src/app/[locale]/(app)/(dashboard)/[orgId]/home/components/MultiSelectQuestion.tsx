"use client";

import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";
import { MultiSelectCardGrid } from "./MultiSelectCardGrid";
import { MultiSelectQuestionProps } from "../types/MultiSelectQuestion.types";

export function MultiSelectQuestion({
	title,
	description,
	options,
}: MultiSelectQuestionProps) {
	const [internalSelectedValues, setInternalSelectedValues] = useState<
		string[]
	>([]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent>
				<MultiSelectCardGrid
					options={options}
					selectedValues={internalSelectedValues}
					onChange={setInternalSelectedValues}
				/>
			</CardContent>
		</Card>
	);
}
