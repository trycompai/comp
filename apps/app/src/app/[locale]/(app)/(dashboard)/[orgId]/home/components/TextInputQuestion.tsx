"use client";

import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";
import { Input } from "@comp/ui/input";
import { TextInputQuestionProps } from "../types/TextInputQuestion.types";

export function TextInputQuestion({
	title,
	description,
}: TextInputQuestionProps) {
	const [inputValue, setInputValue] = useState<string>("");

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent>
				<Input
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					placeholder={description || "Enter text..."}
				/>
			</CardContent>
		</Card>
	);
}
