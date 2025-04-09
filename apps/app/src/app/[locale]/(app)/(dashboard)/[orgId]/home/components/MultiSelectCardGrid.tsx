"use client";

import { Card, CardContent } from "@comp/ui/card";
import type { MultiSelectCardGridProps } from "../types/MultiSelectCardGrid.types";

export function MultiSelectCardGrid({
	options,
	selectedValues,
	onChange,
	className = "",
}: MultiSelectCardGridProps) {
	function handleSelect(value: string) {
		const newSelectedValues = selectedValues.includes(value)
			? selectedValues.filter((item) => item !== value) // Remove if already selected
			: [...selectedValues, value]; // Add if not selected
		onChange(newSelectedValues);
	}

	return (
		<div
			className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 ${className}`}
		>
			{options.map((option) => (
				<Card
					key={option.value}
					className={`cursor-pointer transition-colors ${
						selectedValues.includes(option.value) ? "border-primary" : ""
					}`}
					onClick={() => handleSelect(option.value)}
				>
					<CardContent className="p-4 flex items-center justify-center text-center h-full">
						<span className="text-sm font-medium">{option.label}</span>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
